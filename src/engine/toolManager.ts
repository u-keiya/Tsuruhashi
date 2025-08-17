import { ChatNotifierLike } from './ports';

export interface Tool {
  id: string;
  durability: number;
  maxDurability: number;
}

export interface Item {
  id: string;
  name: string;
  durability?: number;
  maxDurability?: number;
}

export interface InventoryLike {
  nextUsableTool(): Tool | null;
}

export interface MiningEngineLike {
  stopDig(): void;
  equip(tool: Tool): void;
}

/**
 * ToolManager
 * - ツールの耐久度を監視
 * - 耐久度が0になったら予備ツールに自動交換
 * - 予備がない場合はMiningEngineに停止要求
 * - チャット通知を送信
 * - ツール拾得時に自動装備
 */
export class ToolManager {
  private currentTool: Tool | null = null;

  private readonly chatNotifier: ChatNotifierLike;

  private readonly miningEngine: MiningEngineLike;

  private readonly inventory: InventoryLike;

  constructor(params: {
    chatNotifier: ChatNotifierLike;
    miningEngine: MiningEngineLike;
    inventory: InventoryLike;
    initialTool?: Tool;
  }) {
    this.chatNotifier = params.chatNotifier;
    this.miningEngine = params.miningEngine;
    this.inventory = params.inventory;
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

    // 無効な減衰量は無視
    if (!Number.isFinite(blockHardness) || blockHardness <= 0) {
      return;
    }
    // すでに破損済みなら何もしない（重複停止/通知の抑止）
    if (this.currentTool.durability <= 0) {
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
   * アイテム拾得時の処理
   * ツールなら自動装備する
   * @param item 拾得したアイテム
   */
  pickup(item: Item): void {
    // ツールかどうかを判定（durabilityとmaxDurabilityがあるアイテムをツールとみなす）
    if (ToolManager.isTool(item)) {
      const tool: Tool = {
        id: item.id,
        durability: item.durability!,
        maxDurability: item.maxDurability!
      };
      
      // 現在ツールを持っていない場合は自動装備
      if (!this.currentTool) {
        this.equipTool(tool);
        this.chatNotifier.sendMessage(`ツール ${item.name} を装備しました`);
      }
    }
  }

  /**
   * アイテムがツールかどうかを判定
   * @param item 判定するアイテム
   * @returns ツールの場合true
   */
  private static isTool(item: Item): boolean {
    return item.durability !== undefined &&
           item.maxDurability !== undefined &&
           item.durability > 0 &&
           item.maxDurability > 0;
  }

  /**
   * ツールを装備する
   * @param tool 装備するツール
   */
  private equipTool(tool: Tool): void {
    this.currentTool = { ...tool };
    this.miningEngine.equip(tool);
  }

  /**
   * ツール破損時の処理
   * - 予備ツールがあれば自動交換
   * - 予備がない場合はMiningEngineに停止要求
   * - チャット通知
   */
  private handleToolBreak(): void {
    // 予備ツールを取得
    const nextTool = this.inventory.nextUsableTool();
    
    if (nextTool) {
      // 予備ツールがある場合は自動交換
      this.equipTool(nextTool);
      this.chatNotifier.sendMessage('ツール交換完了');
    } else {
      // 予備がない場合は停止
      this.miningEngine.stopDig();
      this.chatNotifier.sendMessage('ツール切れで停止');
    }
  }
}