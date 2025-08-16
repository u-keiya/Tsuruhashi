import { BotState, Coord } from '../types/bot.types';
import { PathFinder } from './pathfinder';

export interface MovePlayerPayload {
  position: Coord;
  on_ground: boolean;
}

export interface ClientLike {
  // bedrock-protocol client compatible (we only need queue in unit tests)
  queue(packetName: 'move_player', payload: MovePlayerPayload): void;
}

export interface StateDBLike {
  upsert(botId: string, state: BotState, pos: Coord): Promise<void> | void;
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

  constructor(params: { botId: string; client: ClientLike; stateDB: StateDBLike; initialPosition: Coord }) {
    this.botId = params.botId;
    this.client = params.client;
    this.stateDB = params.stateDB;
    this.currentPos = { ...params.initialPosition };
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
      if (this.state !== BotState.Moving) return;
      if (this.pathIndex >= this.path.length) {
        // 念のため
        this.state = BotState.Idle;
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

      // 目的地へ到達したら Idle へ
      if (this.pathIndex >= this.path.length) {
        this.state = BotState.Idle;
        // 永続化も Idle へ反映
        await this.stateDB.upsert(this.botId, BotState.Idle, this.currentPos);
        // 完了後は target をクリア
        this.target = null;
      }
    } finally {
      this.stepping = false;
    }
  }
}