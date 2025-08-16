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