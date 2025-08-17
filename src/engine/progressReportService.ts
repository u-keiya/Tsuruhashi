import ProgressReporter from './progressReporter';
import Scheduler from './scheduler';
import { ChatNotifierLike, StateDBReaderLike } from './ports';

/**
 * ProgressReportService
 * - ProgressReporterとSchedulerを統合
 * - 5分ごとの進捗報告を管理
 *
 * US-004: 採掘進捗のチャット可視化
 */
export default class ProgressReportService {
  private readonly progressReporter: ProgressReporter;

  private readonly scheduler: Scheduler;

  constructor(params: {
    botId: string;
    stateDB: StateDBReaderLike;
    chatNotifier: ChatNotifierLike;
    intervalMs?: number; // テスト用にカスタマイズ可能
  }) {
    this.progressReporter = new ProgressReporter({
      botId: params.botId,
      stateDB: params.stateDB,
      chatNotifier: params.chatNotifier
    });
    
    this.scheduler = new Scheduler(params.intervalMs);
  }

  /**
   * 定期進捗報告を開始
   *
   * Scheduler へは ProgressReporter.tick の **バインド済み関数** を直接渡す。
   * これにより Scheduler 側の `await callback()` が正しく Promise を受け取り、
   * Sinon の fake timer でも `runAllAsync()` で非同期完了を検知できる。
   */
  start(): void {
    this.scheduler.start(this.progressReporter.tick.bind(this.progressReporter));
  }

  /**
   * 定期進捗報告を停止
   */
  stop(): void {
    this.scheduler.stop();
  }

  /**
   * サービスが実行中かどうか
   */
  isRunning(): boolean {
    return this.scheduler.isRunning();
  }

  /**
   * 手動で進捗報告を実行（テスト用）
   */
  async reportNow(): Promise<void> {
    await this.progressReporter.tick();
  }
}