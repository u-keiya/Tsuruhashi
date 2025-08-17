import { EventEmitter } from 'events';
import { BotDeletedEvent } from '../types/bot.types';
import Bot from '../models/bot.model';

/**
 * Bot物理削除を管理するクラス
 * ADR0004: Physical Bot Deletion
 * US-005: 不要になったBotを削除できる
 */
export default class DeletionManager extends EventEmitter {
  /**
   * Botを物理削除する
   * @param bot 削除対象のBot
   * @param deletedBy 削除を実行したユーザー（管理者）
   */
  async deleteBot(bot: Bot, deletedBy?: string): Promise<void> {
    const botId = bot.getSummary().id;

    try {
      // 1. Graceful stop - Botプロセスを停止
      await DeletionManager.gracefulStop(bot);

      // 2. State Store(SQLite)からレコード削除
      // TODO: 実際のSQLite実装時に追加
      await DeletionManager.removeBotRecord(botId);

      // 3. インベントリファイルを物理削除
      await DeletionManager.deleteInventoryFiles(botId);

      // 4. BotDeletedイベントをpublish
      const event: BotDeletedEvent = {
        botId,
        timestamp: new Date(),
        deletedBy
      };
      this.publishBotDeletedEvent(event);

    } catch (error) {
      // console.error(`Failed to delete bot ${botId}:`, error);
      throw new Error(`Bot deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Botプロセスを優雅に停止する
   * @param bot 停止対象のBot
   */
  private static async gracefulStop(bot: Bot): Promise<void> {
    return new Promise((resolve) => {
      // Botの切断処理を実行
      bot.disconnect();
      
      // 少し待機してプロセスが完全に終了するのを待つ
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  /**
   * State Store(SQLite)からBotレコードを削除
   * @param botId BotのID
   */
  private static async removeBotRecord(botId: string): Promise<void> {
    // TODO: SQLite実装時に実際のDB削除処理を追加
    // console.log(`Removing bot record from database: ${botId}`);
    // Suppress unused parameter warning
    botId;
  }

  /**
   * Botのインベントリファイルを物理削除
   * @param botId BotのID
   */
  private static async deleteInventoryFiles(botId: string): Promise<void> {
    // TODO: 実際のファイルシステム操作を実装
    // console.log(`Deleting inventory files for bot: ${botId}`);
    // Suppress unused parameter warning
    botId;
  }

  /**
   * BotDeletedイベントをpublish（監査用）
   * @param event BotDeletedイベント
   */
  private publishBotDeletedEvent(event: BotDeletedEvent): void {
    // EventEmitterを使用してイベントを発行
    this.emit('botDeleted', event);
    
    // 監査ログ出力
    // console.log(`Bot deleted: ${JSON.stringify(event)}`);
  }
}