export interface Tool {
  id: string;
  durability: number;
  maxDurability: number;
}

export interface ChatNotifierLike {
  sendMessage(message: string): void;
}

export interface MiningEngineLike {
  stopDig(): void;
}

/**
 * ToolManager
 * - ツールの耐久度を監視
 * - 耐久度が0になったらMiningEngineに停止要求
 * - チャット通知を送信
 */
export class ToolManager {
  private currentTool: Tool | null = null;

  private readonly chatNotifier: ChatNotifierLike;

  private readonly miningEngine: MiningEngineLike;

  constructor(params: {
    chatNotifier: ChatNotifierLike;
    miningEngine: MiningEngineLike;
    initialTool?: Tool;
  }) {
    this.chatNotifier = params.chatNotifier;
    this.miningEngine = params.miningEngine;
    this.currentTool = params.initialTool || null;
  }

  /**
   * ツールの使用を通知し、耐久度を減らす
   * @param blockHardness ブロックの硬度（耐久度減少量）
   */
  notifyUse(blockHardness: number): void {
    if (!this.currentTool) {
      return;
    }

    // 耐久度を減らす
    this.currentTool.durability = Math.max(0, this.currentTool.durability - blockHardness);

    // 耐久度が0になった場合の処理
    if (this.currentTool.durability === 0) {
      this.handleToolBreak();
    }
  }

  /**
   * 現在のツール情報を取得
   */
  getCurrentTool(): Tool | null {
    return this.currentTool ? { ...this.currentTool } : null;
  }

  /**
   * ツールを設定
   */
  setTool(tool: Tool): void {
    this.currentTool = { ...tool };
  }

  /**
   * ツール破損時の処理
   * - MiningEngineに停止要求
   * - チャット通知
   */
  private handleToolBreak(): void {
    // MiningEngineに停止要求
    this.miningEngine.stopDig();
    
    // チャット通知
    this.chatNotifier.sendMessage('ツール切れで停止');
  }
}