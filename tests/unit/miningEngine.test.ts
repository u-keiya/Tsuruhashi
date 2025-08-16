import { expect } from 'chai';
import sinon from 'sinon';
import { MiningEngine, ClientLike, StateDBLike, ToolManagerLike } from '../../src/engine/miningEngine';
import { BotState, Coord, MiningArea } from '../../src/types/bot.types';

describe('MiningEngine', () => {
  let client: ClientLike & { queue: sinon.SinonSpy };
  let stateDB: StateDBLike & { upsert: sinon.SinonSpy };

  beforeEach(() => {
    client = {
      queue: sinon.spy(),
    } as unknown as ClientLike & { queue: sinon.SinonSpy };

    stateDB = {
      upsert: sinon.spy(),
    } as unknown as StateDBLike & { upsert: sinon.SinonSpy };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Idle -> Moving, per-tick MovePacket と StateDB 書き込み、ゴール到達で Idle', async () => {
    const botId = 'bot-xyz';
    const start: Coord = { x: 0, y: 60, z: 0 };
    const goal: Coord = { x: 5, y: 60, z: 3 }; // manhattan = 8 (10 ブロック以内)

    const engine = new MiningEngine({
      botId,
      client,
      stateDB,
      initialPosition: start,
    });

    // 目的地設定で経路生成、Moving 遷移
    engine.setTarget(goal);
    expect(engine.getState()).to.equal(BotState.Moving);

    // Idle になるまで step。無限ループ防止のため最大 64 tick に制限
    let guard = 64;
    while (engine.getState() === BotState.Moving && guard > 0) {
      // eslint-disable-next-line no-await-in-loop
      await engine.step();
      guard -= 1;
    }

    expect(guard).to.be.greaterThan(0, 'Moving が長すぎます（経路が収束しない可能性）');

    // 最終状態は Idle、位置はゴール
    expect(engine.getState()).to.equal(BotState.Idle);
    expect(engine.getPosition()).to.deep.equal(goal);

    // 各 tick で move_player を送っている
    expect(client.queue.callCount).to.be.greaterThan(0);
    for (let i = 0; i < client.queue.callCount; i += 1) {
      const [packetName, payload] = client.queue.getCall(i).args;
      expect(packetName).to.equal('move_player');
      expect(payload).to.have.nested.property('position.x').that.is.a('number');
      expect(payload).to.have.nested.property('position.y').that.is.a('number');
      expect(payload).to.have.nested.property('position.z').that.is.a('number');
    }

    // StateDB は Moving と現在座標を書き込む
    expect(stateDB.upsert.callCount).to.equal(client.queue.callCount + 1);
    for (let i = 0; i < stateDB.upsert.callCount; i += 1) {
      const [calledBotId, calledState, calledPos] = stateDB.upsert.getCall(i).args as [string, BotState, Coord];
      expect(calledBotId).to.equal(botId);
      if (i < client.queue.callCount) {
        expect(calledState).to.equal(BotState.Moving);
      } else {
        expect(calledState).to.equal(BotState.Idle);
      }
      expect(calledPos).to.have.keys(['x', 'y', 'z']);
      if (i < client.queue.callCount) {
        const queuedPos = (client.queue.getCall(i).args[1] as any).position;
        expect(calledPos).to.deep.equal(queuedPos);
      }
    }

    // 最終 tick の MovePacket 位置はゴールに一致するはず
    const lastMoveArgs = client.queue.getCall(client.queue.callCount - 1).args[1];
    expect(lastMoveArgs.position).to.deep.equal(goal);
  });

  it('経路が存在しない場合は Idle のまま（MovePacket/StateDB 書き込みなし）', async () => {
    const botId = 'bot-no-path';
    const start: Coord = { x: 0, y: 60, z: 0 };
    const goal: Coord = { x: 1, y: 60, z: 0 };

    const engine = new MiningEngine({
      botId,
      client,
      stateDB,
      initialPosition: start,
    });

    // どこへも進めない passable
    const passable = (c: Coord) => c.x === start.x && c.y === start.y && c.z === start.z;

    engine.setTarget(goal, passable);
    expect(engine.getState()).to.equal(BotState.Idle);

    await engine.step(); // no-op
    expect(client.queue.called).to.be.false;
    expect(stateDB.upsert.called).to.be.false;
    expect(engine.getPosition()).to.deep.equal(start);
  });
});

describe('MiningEngine - Auto mining loop (Issue #5 US-001-4)', () => {
  it('Idle中、miningQueueがあれば DigStart→Ack→notifyUse/incrementMined を処理し、minedBlocks を加算', async () => {
    const botId = 'bot-auto-1';
    const start: Coord = { x: 0, y: 60, z: 0 };
    const oneBlock: MiningArea = { start: { x: 0, y: 60, z: 1 }, end: { x: 0, y: 60, z: 1 } };

    const client = { queue: sinon.spy() } as unknown as ClientLike & { queue: sinon.SinonSpy };
    const stateDB = {
      upsert: sinon.spy(),
      incrementMined: sinon.spy(),
    } as unknown as StateDBLike & { upsert: sinon.SinonSpy; incrementMined: sinon.SinonSpy };
    const toolManager = { notifyUse: sinon.spy() } as unknown as ToolManagerLike & { notifyUse: sinon.SinonSpy };

    const engine = new MiningEngine({ botId, client, stateDB, initialPosition: start, toolManager });

    // 採掘範囲を1ブロック分設定（移動せず、その場で採掘開始）
    engine.setMiningArea(oneBlock);
    expect(engine.getState()).to.equal(BotState.Idle);

    // 1tick 実行で DigStart→即時Ack が処理される（簡易実装）
    await engine.step();

    // player_action(start_break) が1回送信される
    const actionCalls = (client.queue as sinon.SinonSpy).getCalls().filter((c) => c.args[0] === 'player_action');
    expect(actionCalls.length).to.equal(1);
    expect(actionCalls[0].args[1]).to.have.property('action', 'start_break');

    // Tool が1回使用され、StateDB.incrementMined が1回呼ばれる
    expect((toolManager.notifyUse as sinon.SinonSpy).callCount).to.equal(1);
    expect((stateDB as any).incrementMined.callCount).to.equal(1);

    // エンジンの内部カウンタも 1
    expect(engine.getMinedBlocks()).to.equal(1);

    // 採掘完了後は Idle に戻る
    expect(engine.getState()).to.equal(BotState.Idle);
    // player_action(start_break)送信時のposition(x,y,z)をアサート
    const startBreakCall = actionCalls[0];
    expect(startBreakCall.args[1]).to.have.property('position');
    expect(startBreakCall.args[1].position).to.have.keys(['x', 'y', 'z']);
    expect(startBreakCall.args[1].position).to.deep.equal(oneBlock.start);

    // move_player→player_actionの送信順序をアサート
    const calls = (client.queue as sinon.SinonSpy).getCalls();
    const moveIdx = calls.findIndex((c) => c.args[0] === 'move_player');
    const actionIdx = calls.findIndex((c) => c.args[0] === 'player_action');
    if (moveIdx !== -1 && actionIdx !== -1) {
      expect(moveIdx).to.be.lessThan(actionIdx, 'move_playerはplayer_actionより前に送信されるべき');
    }
  });

  it('移動完了後に Mining へ遷移し、ブロック単位で DigStart→Ack を処理', async () => {
    const botId = 'bot-auto-2';
    const start: Coord = { x: 0, y: 60, z: 0 };
    const goal: Coord = { x: 2, y: 60, z: 0 };

    const client = { queue: sinon.spy() } as unknown as ClientLike & { queue: sinon.SinonSpy };
    const stateDB = {
      upsert: sinon.spy(),
      incrementMined: sinon.spy(),
    } as unknown as StateDBLike & { upsert: sinon.SinonSpy; incrementMined: sinon.SinonSpy };
    const toolManager = { notifyUse: sinon.spy() } as unknown as ToolManagerLike & { notifyUse: sinon.SinonSpy };

    const engine = new MiningEngine({ botId, client, stateDB, initialPosition: start, toolManager });

    // ゴール地点のブロックを1つ採掘対象としてキューに入れる
    engine.setMiningArea({ start: goal, end: goal });

    // まずはゴールへ移動
    engine.setTarget(goal);
    expect(engine.getState()).to.equal(BotState.Moving);

    // 移動完了 → Idle 永続化 → 直後に採掘開始＆Ack（同tick内で完了）
    let guard = 64;
    while (engine.getState() === BotState.Moving && guard > 0) {
      // eslint-disable-next-line no-await-in-loop
      await engine.step();
      guard -= 1;
    }
    expect(guard).to.be.greaterThan(0);

    // move_player が1回以上、player_action(start_break) が1回
    const moveCalls = (client.queue as sinon.SinonSpy).getCalls().filter((c) => c.args[0] === 'move_player');
    expect(moveCalls.length).to.be.greaterThan(0);
    const actionCalls = (client.queue as sinon.SinonSpy).getCalls().filter((c) => c.args[0] === 'player_action');
    expect(actionCalls.length).to.equal(1);

    // Tool 使用と mined カウント
    expect((toolManager.notifyUse as sinon.SinonSpy).callCount).to.equal(1);
    expect((stateDB as any).incrementMined.callCount).to.equal(1);
    expect(engine.getMinedBlocks()).to.equal(1);

    // 最終は Idle、位置はゴール
    expect(engine.getState()).to.equal(BotState.Idle);
    expect(engine.getPosition()).to.deep.equal(goal);
  });
});