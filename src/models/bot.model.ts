import { createClient, Client } from 'bedrock-protocol';
import { v4 as uuidv4 } from 'uuid';
import { BotState, BotSummary, Coord, MiningArea } from '../types/bot.types';

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

  constructor() {
    this.id = uuidv4();
    this.state = BotState.Idle;
    this.client = null;
    this.position = null;
    this.miningArea = null;
    this.ownerPlayerId = null;
  }

  /**
   * サーバーに接続する
   * @param playerId プレイヤーID
   */
  async connect(playerId: string): Promise<void> {
    this.ownerPlayerId = playerId;
    try {
      this.client = await createClient({
        host: 'localhost',
        port: 19132,
        username: `Bot-${this.id.slice(0, 8)}`,
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

    } catch (error) {
      console.error('Failed to connect:', error);
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

  private static isValidCoord(c: Coord | undefined | null): c is Coord {
    const MIN_Y = -64;
    const MAX_Y = 320;
    return !!c
      && Number.isInteger(c.x) && Number.isInteger(c.y) && Number.isInteger(c.z)
      && c.y >= MIN_Y && c.y <= MAX_Y;
  }
}