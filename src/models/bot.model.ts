import { createClient, Client } from 'bedrock-protocol';
import { v4 as uuidv4 } from 'uuid';
import { BotState, BotSummary, Coord, MiningArea } from '../types/bot.types';
import { MiningEngine } from '../engine/miningEngine';

/**
 * Minecraftのボットを表すクラス
 * US-001-1: Botのサモン機能
 */
export default class Bot {
  private readonly id: string;

  private state: BotState;

  private client: Client | null;

  private position: Coord | null;

  private miningArea: MiningArea | null;

  private ownerPlayerId: string | null;

  private miningEngine: MiningEngine | null;

  constructor() {
    this.id = uuidv4();
    this.state = BotState.Idle;
    this.client = null;
    this.position = null;
    this.miningArea = null;
    this.ownerPlayerId = null;
    this.miningEngine = null;
  }

  /**
   * サーバーに接続する
   * @param playerId プレイヤーID
   */
  async connect(playerId: string): Promise<void> {
    this.ownerPlayerId = playerId;
    try {
      // 複数Bot同時接続時のユーザー名重複を避けるため、タイムスタンプを追加
      const timestamp = Date.now().toString(36);
      const uniqueUsername = `Bot-${this.id.slice(0, 6)}-${timestamp.slice(-4)}`;
      
      this.client = await createClient({
        host: 'localhost',
        port: 19132,
        username: uniqueUsername,
        offline: true
      });

      this.client.on('spawn', () => {
        this.state = BotState.Idle;
      });

      this.client.on('move', (packet) => {
        this.position = {
          x: packet.x,
          y: packet.y,
          z: packet.z
        };
      });

      // End/error ハンドラを追加
      this.client.on('end', () => {
        // console.log(`Bot ${this.id} disconnected.`);
        this.client = null;
        this.miningEngine = null; // エンジンも破棄
      });

      this.client.on('error', (err) => {
        // console.error(`Bot ${this.id} connection error:`, err);
        this.client = null;
        this.miningEngine = null;
      });

    } catch (error) {
      // console.error('Failed to connect:', error);
      throw new Error('Failed to connect to Minecraft server');
    }
  }

  /**
   * 切断処理
   */
  disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    // エンジン参照も明示的に破棄（再接続時の取り違え防止）
    this.miningEngine = null;
  }

  /**
   * Bot情報の取得
   */
  getSummary(): BotSummary {
    return {
      id: this.id,
      state: this.state
    };
  }

  /**
   * 現在位置の取得
   */
  getPosition(): Coord | null {
    return this.position;
  }

  /**
   * 採掘エリアの設定
   * @param area MiningArea
   * @throws Error 引数が不正な場合
   */
  setMiningArea(area: MiningArea): void {
    if (!Bot.isValidCoord(area?.start) || !Bot.isValidCoord(area?.end)) {
      throw new Error('InvalidRange');
    }
    // 外部からの参照/改変を防ぐためディープコピーして保持
    this.miningArea = {
      start: { x: area.start.x, y: area.start.y, z: area.start.z },
      end:   { x: area.end.x,   y: area.end.y,   z: area.end.z   }
    };
  }

  /**
   * 採掘エリアの取得
   */
  getMiningArea(): MiningArea | null {
    // 保持している内部状態を外部から改変できないよう常にコピーを返す
    return this.miningArea
      ? {
          start: { ...this.miningArea.start },
          end:   { ...this.miningArea.end }
        }
      : null;
  }

  /**
   * 現在のstateを取得
   */
  getState(): BotState {
    return this.state;
  }

  /**
   * stateを設定（内部使用）
   */
  /**
   * @internal
   * 状態遷移の一貫性を保つため、Service/Engine のみが通る経路で利用すること
   */
  setState(state: BotState): void {
    this.state = state;
  }

  /**
   * MiningEngineを設定
   */
  setMiningEngine(engine: MiningEngine): void {
    // 旧エンジンの停止/破棄が必要な場合はここで対応
    // if (this.miningEngine) { this.miningEngine.stop?.(); }
    this.miningEngine = engine;
  }

  /**
   * MiningEngineを取得
   */
  getMiningEngine(): MiningEngine | null {
    // 再利用する場合は currentPos, queue の同期に注意
    return this.miningEngine;
  }

  /**
   * Clientを取得（MiningEngine作成用）
   */
  getClient(): Client | null {
    // 返す型は最小限のインターフェイスに寄せると安全
    return this.client;
  }

  private static isValidCoord(c: Coord | undefined | null): c is Coord {
    const MIN_Y = -64;
    const MAX_Y = 320;
    return !!c
      && Number.isInteger(c.x) && Number.isInteger(c.y) && Number.isInteger(c.z)
      && c.y >= MIN_Y && c.y <= MAX_Y;
  }
}