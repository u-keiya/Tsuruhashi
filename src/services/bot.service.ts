import Bot from '../models/bot.model';
import { BotSummary, MiningArea } from '../types/bot.types';
import DeletionManager from '../engine/deletionManager';

/**
 * Botのサービスクラス
 * US-001-1: Botのサモン機能
 */
export default class BotService {
  private bots: Map<string, Bot>;

  private deletionManager: DeletionManager;

  constructor() {
    this.bots = new Map();
    this.deletionManager = new DeletionManager();
  }

  /**
   * 新しいBotをサモンする
   * @param playerId プレイヤーID
   * @returns BotSummary Botの概要情報
   * @throws Error 接続に失敗した場合
   */
  async summonBot(playerId: string): Promise<BotSummary> {
    const bot = new Bot();
    await bot.connect(playerId);
      
    const summary = bot.getSummary();
    this.bots.set(summary.id, bot);
      
    return summary;
  }

  /**
   * 指定したIDのBotを取得する
   * @param botId BotのID
   * @returns Bot | undefined
   */
  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
  }

  /**
   * 指定したIDのBotを削除する（物理削除）
   * @param botId BotのID
   * @param deletedBy 削除を実行したユーザー（管理者）
   */
  async deleteBot(botId: string, deletedBy?: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error('BotNotFound');
    }

    // DeletionManagerを使用して物理削除を実行
    await this.deletionManager.deleteBot(bot, deletedBy);
    
    // メモリ上のBotインスタンスを削除
    this.bots.delete(botId);
  }

  /**
   * 全てのBotの情報を取得する
   * @returns BotSummary[]
   */
  getAllBots(): BotSummary[] {
    return Array.from(this.bots.values()).map(bot => bot.getSummary());
  }

  /**
   * 採掘エリアを設定する
   * @param botId BotのID
   * @param area 採掘エリア
   * @throws Error 'BotNotFound' | 'InvalidRange'
   */
  setMiningArea(botId: string, area: MiningArea): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error('BotNotFound');
    }
    // Bot.setMiningArea 内で InvalidRange を検証
    bot.setMiningArea(area);
  }
}