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
   * @param count 生成するBot数（デフォルト: 1）
   * @returns BotSummary[] Botの概要情報配列
   * @throws Error 接続に失敗した場合
   */
  async summonBot(playerId: string, count: number = 1): Promise<BotSummary[]> {
    if (!Number.isFinite(count) || !Number.isInteger(count) || count < 1 || count > 10) {
      throw new Error('Bot count must be between 1 and 10');
    }

    const bots: Bot[] = Array.from({ length: count }, () => new Bot());
    const summaries: BotSummary[] = new Array(count);

    try {
      await Promise.all(
        bots.map(async (bot, idx) => {
          await bot.connect(playerId);
          summaries[idx] = bot.getSummary();
        })
      );
      // すべて成功したら初めて登録（原子化）
      summaries.forEach((s, idx) => {
        this.bots.set(s.id, bots[idx]);
      });
      return summaries;
    } catch (e) {
      // 部分成功時は後始末
      bots.forEach(bot => {
        try {
          bot.disconnect();
        } catch {
          /* noop */
        }
      });
      throw e instanceof Error ? e : new Error('Failed to summon bots');
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