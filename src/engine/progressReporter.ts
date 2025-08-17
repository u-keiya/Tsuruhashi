import { ProgressMetrics, MiningStats } from '../types/bot.types';
import { ChatNotifierLike, StateDBReaderLike } from './ports';

/**
 * ProgressReporter
 * - StateDBから進捗データを取得
 * - フォーマット済みメッセージを生成
 * - ChatNotifierを通じてBedrockサーバーに送信
 * 
 * US-004: 採掘進捗のチャット可視化
 */
export default class ProgressReporter {
  private readonly botId: string;

  private readonly stateDB: StateDBReaderLike;

  private readonly chatNotifier: ChatNotifierLike;

  constructor(params: {
    botId: string;
    stateDB: StateDBReaderLike;
    chatNotifier: ChatNotifierLike;
  }) {
    this.botId = params.botId;
    this.stateDB = params.stateDB;
    this.chatNotifier = params.chatNotifier;
  }

  /**
   * 進捗報告を実行
   * - StateDBから統計情報を取得
   * - メトリクスを計算
   * - フォーマット済みメッセージを送信
   */
  async tick(): Promise<void> {
    try {
      const stats = await this.stateDB.getMiningStats(this.botId);
      const metrics = ProgressReporter.calculateMetrics(stats);
      const message = ProgressReporter.formatMessage(metrics);
      this.chatNotifier.sendMessage(message);
    } catch (error) {
      console.error('Failed to report progress:', error);
    }
  }

  /**
   * 統計情報からメトリクスを計算
   */
  private static calculateMetrics(stats: MiningStats): ProgressMetrics {
    // 進捗率の計算（Y座標ベース）
    const totalDistance = Math.abs(stats.targetY - stats.currentY);
    const progress = totalDistance === 0 ? 100 :
      Math.min(100, Math.max(0, (1 - totalDistance / Math.abs(stats.targetY)) * 100));

    return {
      progress: Math.round(progress),
      current: stats.currentY,
      target: stats.targetY,
      durability: stats.durability,
      maxDurability: stats.maxDurability,
      toolCount: stats.toolCount
    };
  }

  /**
   * US-004で指定されたフォーマットでメッセージを生成
   * 【進捗】{progress}%  (Y={current}/{target})
   * 【ツール】残り耐久値 {durability}/{max_durability} ・残りツール数 {tool_count}個
   */
  private static formatMessage(metrics: ProgressMetrics): string {
    const progressLine = `【進捗】${metrics.progress}%  (Y=${metrics.current}/${metrics.target})`;
    const toolLine = `【ツール】残り耐久値 ${metrics.durability}/${metrics.maxDurability} ・残りツール数 ${metrics.toolCount}個`;
    
    return `${progressLine}\n${toolLine}`;
  }
}