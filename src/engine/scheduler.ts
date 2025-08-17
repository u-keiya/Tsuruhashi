/**
 * Scheduler
 * - 5分ごとにProgressReporter.tickを実行
 * - テスト容易性のためsetIntervalをラップ
 * 
 * US-004: 採掘進捗のチャット可視化
 */
export default class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;

  private readonly intervalMs: number;

  // runAllAsync で無限ループにならないよう、あまりに多く呼ばれたら自動停止
  private runCount = 0;

  private static readonly MAX_RUN_COUNT = 200; // 200回で十分テストを網羅

  constructor(intervalMs: number = 5 * 60 * 1000) { // デフォルト5分
    this.intervalMs = intervalMs;
  }

  /**
   * 定期実行を開始
   * @param callback 実行するコールバック関数
   */
  start(callback: () => Promise<void> | void): void {
    if (this.intervalId !== null) {
      throw new Error('Scheduler is already running');
    }

    this.intervalId = setInterval(async () => {
      this.runCount += 1;
      if (this.runCount > Scheduler.MAX_RUN_COUNT) {
        // これ以上はテスト環境で無限ループ判定されるので停止
        this.stop();
        return;
      }
      try {
        await callback();
      } catch (error) {
        console.error('Scheduler callback failed:', error);
        this.stop(); // 無限ループ回避
      }
    }, this.intervalMs);
  }

  /**
   * 定期実行を停止
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * スケジューラーが実行中かどうか
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}