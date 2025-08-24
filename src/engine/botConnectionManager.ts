import { EventEmitter } from 'events';
import { Client, createClient } from 'bedrock-protocol';

export interface BotConnectionOptions {
  host: string;
  port: number;
  username: string;
  offline?: boolean;
}

export interface ClientFactory {
  createClient(options: {
    host: string;
    port: number;
    username: string;
    offline?: boolean;
  }): Promise<Client>;
}


export interface ConnectionEvents {
  connected: () => void;
  disconnected: (reason?: string) => void;
  reconnecting: (attempt: number, maxRetries: number) => void;
  reconnectFailed: (error: Error) => void;
}

/**
 * Bot の接続管理を担うクラス
 * 自動再接続と Keep-Alive を提供
 *
 * 設計参照:
 * - docs/03_design/diagrams/class/botcore.puml (BotConnectionManager)
 * - docs/03_design/diagrams/sequence/reconnect_flow.puml
 * - docs/03_design/adr/0002-async-retry-architecture.md
 */
export class BotConnectionManager extends EventEmitter {
  private client: Client | null = null;

  private options: BotConnectionOptions;

  private retryCount = 0;

  private lastPingAt: Date | null = null;

  private keepAliveInterval: NodeJS.Timeout | null = null;

  private reconnectTimeout: NodeJS.Timeout | null = null;

  private isConnecting = false;

  private isReconnecting = false;

  private keepAliveIntervalMs = 10000; // デフォルト10秒

  private clientFactory: ClientFactory | null;

  constructor(options: BotConnectionOptions, clientFactory?: ClientFactory) {
    super();
    this.options = { ...options };
    this.clientFactory = clientFactory || null;
  }

  /**
   * サーバーに接続する
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.client) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.client = this.clientFactory
        ? await this.clientFactory.createClient({
            host: this.options.host,
            port: this.options.port,
            username: this.options.username,
            offline: this.options.offline ?? true
          })
        : await createClient({
            host: this.options.host,
            port: this.options.port,
            username: this.options.username,
            offline: this.options.offline ?? true
          });

      this.setupEventHandlers();
      this.retryCount = 0;
      this.isConnecting = false;
      this.emit('connected');
      
      // Keep-Alive開始
      this.startKeepAlive(this.keepAliveIntervalMs);
      
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * 切断処理
   * @param reason 切断理由
   */
  disconnect(reason?: string): void {
    this.cleanup();
    this.emit('disconnected', reason);
  }

  /**
   * 自動再接続の開始
   * @param maxRetry 最大リトライ回数 (デフォルト: 5)
   */
  autoReconnect(maxRetry = 5): void {
    if (this.isReconnecting) {
      return;
    }

    // 既存の再接続スケジュールをキャンセル（手動 connect との競合回避）
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isReconnecting = true;
    
    // 指数バックオフ計算: 1s -> 2s -> 4s -> 8s -> 16s
    const backoffMs = Math.min(1000 * (2 ** this.retryCount), 16000);
    
    this.emit('reconnecting', this.retryCount + 1, maxRetry);
    
    this.reconnectTimeout = setTimeout(async () => {
      try {
        this.retryCount += 1;
        await this.connect();
        this.isReconnecting = false;
        this.retryCount = 0; // 成功時はリセット
        
      } catch (error) {
        if (this.retryCount >= maxRetry) {
          this.isReconnecting = false;
          this.emit('reconnectFailed', error as Error);
          // 次回の再接続要求をブロックしないようにカウンタをリセット
          this.retryCount = 0;
        } else {
          // 次のリトライを開始
          this.isReconnecting = false;
          this.autoReconnect(maxRetry);
        }
      }
    }, backoffMs);
  }

  /**
   * Keep-Aliveの開始
   * @param interval Keep-Alive間隔（ミリ秒、デフォルト: 10秒）
   */
  keepAlive(interval = 10000): void {
    this.keepAliveIntervalMs = interval;
    if (this.client && this.isConnected()) {
      this.startKeepAlive(interval);
    }
  }

  /**
   * 接続状態の確認
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * 現在のクライアントを取得
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * リソースのクリーンアップ
   */
  private cleanup(): void {
    // Keep-Aliveタイマーの停止
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    // 再接続タイマーの停止
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // クライアント接続の切断
    if (this.client) {
      this.client.removeAllListeners();
      this.client.close();
      this.client = null;
    }

    this.isConnecting = false;
    this.isReconnecting = false;
  }

  /**
   * イベントハンドラの設定
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('spawn', () => {
      // スポーン成功時
      this.lastPingAt = new Date();
    });

    this.client.on('end', () => {
      this.cleanup();
      this.emit('disconnected', 'Server ended connection');
      
      // 自動再接続の開始
      this.autoReconnect(5);
    });

    this.client.on('error', (error) => {
      this.cleanup();
      this.emit('disconnected', `Connection error: ${error.message}`);
      
      // 自動再接続の開始
      this.autoReconnect(5);
    });

    this.client.on('close', () => {
      this.cleanup();
      this.emit('disconnected', 'Connection closed');
      this.autoReconnect(5);
    });
    // Keep-Alive用のheartbeatイベント
    this.client.on('heartbeat', () => {
      this.lastPingAt = new Date();
    });
  }

  /**
   * Keep-Aliveの開始
   */
  private startKeepAlive(interval: number): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      if (!this.isConnected() || !this.client) {
        return;
      }

      // Ping送信 (bedrock-protocolでは自動的にheartbeatが送信される)
      const now = new Date();
      
      // 最後のPingから interval * 2 以上経過している場合はタイムアウトと判断
      if (this.lastPingAt && (now.getTime() - this.lastPingAt.getTime()) > interval * 2) {
        // Ping timeout - 再接続を試行
        this.disconnect('Ping timeout');
        this.autoReconnect(5);
      }
    }, interval);
  }
}

export default BotConnectionManager;