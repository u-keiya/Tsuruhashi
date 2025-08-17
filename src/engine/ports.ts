import { MiningStats } from '../types/bot.types';

export interface ChatNotifierLike {
  sendMessage(message: string): void;
}

/**
 * StateDBから進捗データを取得するためのインターフェース
 */
export interface StateDBReaderLike {
  getMiningStats(botId: string): Promise<MiningStats> | MiningStats;
}