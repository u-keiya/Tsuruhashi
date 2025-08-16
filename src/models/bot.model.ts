import { createClient, Client } from 'bedrock-protocol';
import { v4 as uuidv4 } from 'uuid';
import { BotState, BotSummary, Coord } from '../types/bot.types';

/**
 * Minecraftのボットを表すクラス
 * US-001-1: Botのサモン機能
 */
export default class Bot {
  private readonly id: string;

  private state: BotState;

  private client: Client | null;

  private position: Coord | null;

  private ownerPlayerId: string | null;

  constructor() {
    this.id = uuidv4();
    this.state = BotState.Idle;
    this.client = null;
    this.position = null;
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
}