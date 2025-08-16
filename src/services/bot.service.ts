import Bot from '../models/bot.model';
import { BotSummary, MiningArea } from '../types/bot.types';

/**
 * Botのサービスクラス
 * US-001-1: Botのサモン機能
 */
export default class BotService {
  private bots: Map<string, Bot>;

  constructor() {
    this.bots = new Map();
  }

  /**
   * 新しいBotをサモンする
   * @param playerId プレイヤーID
   * @returns BotSummary Botの概要情報
   * @throws Error 接続に失敗した場合
   */
  async summonBot(playerId: string): Promise<BotSummary> {
    try {
      const bot = new Bot();
      await bot.connect(playerId);
      
      const summary = bot.getSummary();
      this.bots.set(summary.id, bot);
      
      return summary;
    } catch (error) {
      console.error('Failed to summon bot:', error);
      throw error;
    }
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
   * 指定したIDのBotを削除する
   * @param botId BotのID
   */
  deleteBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.disconnect();
      this.bots.delete(botId);
    }
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