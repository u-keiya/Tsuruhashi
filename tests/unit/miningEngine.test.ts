import { expect } from 'chai';
import sinon from 'sinon';
import { MiningEngine, ClientLike, StateDBLike } from '../../src/engine/miningEngine';
import { BotState, Coord } from '../../src/types/bot.types';

describe('MiningEngine', () => {
  let client: ClientLike & { queue: sinon.SinonSpy };
  let stateDB: StateDBLike & { upsert: sinon.SinonSpy };

  beforeEach(() => {
    client = {
      queue: sinon.spy(),
    };

    stateDB = {
      upsert: sinon.spy(),
    };
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