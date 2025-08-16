import { BotState, Coord, MiningArea } from '../types/bot.types';
import { PathFinder } from './pathfinder';

export interface MovePlayerPayload {
  position: Coord;
  on_ground: boolean;
}

export interface PlayerActionPayload {
  action: string; // e.g. 'start_break'
  position: Coord;
  face?: number;
}

export interface ClientLike {
  // bedrock-protocol client compatible (we only need queue in unit tests)
  queue(
    packetName: 'move_player' | 'player_action',
    payload: MovePlayerPayload | PlayerActionPayload
  ): void;
}

export interface StateDBLike {
  upsert(botId: string, state: BotState, pos: Coord): Promise<void> | void;
  // 自動採掘での累積カウント（任意実装）
  incrementMined?(botId: string, n: number): Promise<void> | void;
}

export interface ToolManagerLike {
  notifyUse(blockHardness: number): void;
}

/**
 * MiningEngine
 * - Idle -> Moving 遷移
 * - per-tick (step) で MovePacket を送信し座標を更新
 * - StateDB に state/position を書き込む
 *
 * テスト容易性のためポーリング(setInterval)ではなく明示 step() を採用。
 */
export class MiningEngine {
  private readonly botId: string;

  private readonly client: ClientLike;

  private readonly stateDB: StateDBLike;

  private state: BotState = BotState.Idle;

  private stepping: boolean = false;

  private currentPos: Coord;

  private target: Coord | null = null;

  private path: Coord[] = [];

  private pathIndex = 0;

  // === Auto Mining ===
  private toolManager?: ToolManagerLike;

  private miningQueue: Coord[] = [];

  private minedBlocks: number = 0;

  constructor(params: {
    botId: string;
    client: ClientLike;
    stateDB: StateDBLike;
    initialPosition: Coord;
    toolManager?: ToolManagerLike;
  }) {
    this.botId = params.botId;
    this.client = params.client;
    this.stateDB = params.stateDB;
    this.currentPos = { ...params.initialPosition };
    this.toolManager = params.toolManager;
  }

  getState(): BotState {
    return this.state;
  }

  getPosition(): Coord {
    return { ...this.currentPos };
  }

  getTarget(): Coord | null {
    return this.target ? { ...this.target } : null;
  }

  /**
   * 目的地を設定し、経路を計算して Moving に遷移
   */
  setTarget(target: Coord, passable?: (c: Coord) => boolean): void {
    this.target = { ...target };
    this.path = PathFinder.calcPath(this.currentPos, this.target, passable);
    // 経路の先頭は start なのでスキップ。長さ1（start==goal）は Idle のまま。
    if (this.path.length <= 1) {
      this.pathIndex = 0;
      this.state = BotState.Idle;
      return;
    }
    this.pathIndex = 1;
    this.state = BotState.Moving;
  }

  /**
   * 採掘エリアをセットして、内部の採掘キュー（ブロック座標列）を生成する
   * - start/end の範囲は各軸で小さい方→大きい方に正規化
   */
  setMiningArea(area: MiningArea): void {
    const minX = Math.min(area.start.x, area.end.x);
    const maxX = Math.max(area.start.x, area.end.x);
    const minY = Math.min(area.start.y, area.end.y);
    const maxY = Math.max(area.start.y, area.end.y);
    const minZ = Math.min(area.start.z, area.end.z);
    const maxZ = Math.max(area.start.z, area.end.z);

    // 既存キューに追記（上書きではない）
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          this.miningQueue.push({ x, y, z });
        }
      }
    }
  }

  /**
   * 現在までに採掘完了したブロック数を返す（ユニットテスト用）
   */
  getMinedBlocks(): number {
    return this.minedBlocks;
  }

  /**
   * 1tick 進める
   * - 次のノードへ移動
   * - MovePacket を送信
   * - StateDB へ書き込み
   * - ゴールへ到達したら Idle へ戻す
   */
  async step(): Promise<void> {
    if (this.stepping) return;
    this.stepping = true;
    try {
      // Idle 中に採掘キューが有れば次の作業を割り当て
      if (this.state === BotState.Idle) {
        this.scheduleNextMining();
      }

      if (this.state === BotState.Mining) {
        // 採掘中は Ack 待ち。tick では何もしない（StateDB 更新のみ任意）
        return;
      }

      if (this.state !== BotState.Moving) return;
      if (this.pathIndex >= this.path.length) {
        // 念のため
        this.state = BotState.Idle;
        // 目的地へ着いたので次の採掘に移行（ある場合）
        this.scheduleNextMining();
        return;
      }

      // 次の地点へ「移動」
      const next = this.path[this.pathIndex];
      this.currentPos = { ...next };
      this.pathIndex += 1;

      // Bedrock の move packet を送る（payload は最小限、ユニットテストではモック）
      this.client.queue('move_player', {
        position: {
          x: this.currentPos.x,
          y: this.currentPos.y,
          z: this.currentPos.z
        },
        on_ground: true
      });

      // StateDB 書き込み（Moving と現在座標）
      await this.stateDB.upsert(this.botId, BotState.Moving, this.currentPos);

      // 目的地へ到達したら Idle -> 採掘へ
      if (this.pathIndex >= this.path.length) {
        this.state = BotState.Idle;
        // 永続化も Idle へ反映
        await this.stateDB.upsert(this.botId, BotState.Idle, this.currentPos);
        // 完了後は target をクリア
        this.target = null;
        // 次の作業（採掘）があれば開始
        this.scheduleNextMining();
      }
    } finally {
      this.stepping = false;
    }
  }

  /**
   * 次のブロック採掘を開始（DigStart）し、Ack を即時処理する簡易実装
   * - 実機では Bedrock Server からの Ack をイベントで受け取る
   */
  private scheduleNextMining(): void {
    if (this.miningQueue.length === 0) return;
    const block = this.miningQueue.shift() as Coord;

    // 採掘開始
    this.state = BotState.Mining;
    this.client.queue('player_action', {
      action: 'start_break',
      position: { ...block },
      face: 1
    });

    // ここでは即時 Ack とみなして処理を進める
    this.onDigAck();
  }

  /**
   * DigAck を受け取ったときの処理
   * - ToolManager への使用通知
   * - StateDB の採掘カウント加算
   * - state を Idle へ戻す
   */
  private onDigAck(): void {
    // ブロック硬度はテスト容易性のため固定値 1 とする
    this.toolManager?.notifyUse(1);
    this.minedBlocks += 1;
    if (typeof this.stateDB.incrementMined === 'function') {
      this.stateDB.incrementMined(this.botId, 1);
    }
    this.state = BotState.Idle;
  }
}