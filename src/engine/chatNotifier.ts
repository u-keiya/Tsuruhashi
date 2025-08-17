import { ClientLike, TextPayload } from './miningEngine';
import { ChatNotifierLike } from './ports';

/**
 * ChatNotifier
 * - Minecraftサーバーにチャットメッセージを送信
 */
export default class ChatNotifier implements ChatNotifierLike {
  private readonly client: ClientLike;

  constructor(client: ClientLike) {
    this.client = client;
  }

  /**
   * チャットメッセージを送信
   * @param message 送信するメッセージ
   */
  sendMessage(message: string): void {
    // bedrock-protocolでチャットメッセージを送信
    // 実際の実装では text パケットを使用
    const payload: TextPayload = {
      type: 'chat',
      message,
      source_name: '',
      xuid: '',
      platform_chat_id: ''
    };
    this.client.queue('text', payload);
  }
}