/**
 * Bot関連の型定義
 * US-001-1: Botのサモン機能
 */

/**
 * Botの状態を表す列挙型
 */
export enum BotState {
  Idle = 'Idle',
  Moving = 'Moving',
  Mining = 'Mining',
  ToolSwap = 'ToolSwap',
}

/**
 * Botの概要情報
 */
export interface BotSummary {
  id: string;
  state: BotState;
}

/**
 * Botサモンリクエストのボディ
 */
export interface SummonBotRequest {
  playerId: string;
  count?: number; // 複数Bot生成用のカウント（デフォルト: 1）
}

/**
 * 座標情報
 */
export interface Coord {
  x: number;
  y: number;
  z: number;
}

/**
 * 採掘エリア
 */
export interface MiningArea {
  start: Coord;
  end: Coord;
}

/**
 * 進捗報告用のメトリクス
 */
export interface ProgressMetrics {
  progress: number; // 進捗率（%）
  current: number; // 現在のY座標
  target: number; // 目標のY座標
  durability: number; // 現在の耐久値
  maxDurability: number; // 最大耐久値
  toolCount: number; // 残りツール数
}

/**
 * StateDBから取得する統計情報
 */
export interface MiningStats {
  minedBlocks: number;
  durability: number;
  maxDurability: number;
  toolCount: number;
  currentY: number;
  targetY: number;
}

/**
 * Bot削除イベント（US-005）
 */
export interface BotDeletedEvent {
  botId: string;
  timestamp: Date;
  deletedBy?: string; // 削除を実行したユーザー（管理者）
}

/**
 * 削除リクエストの権限情報
 */
export interface DeleteBotRequest {
  isAdmin: boolean;
  userId?: string;
}