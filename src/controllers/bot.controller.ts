import { Request, Response } from 'express';
import BotService, { BOT_COUNT_RANGE_ERROR } from '../services/bot.service';
import { SummonBotRequest, MiningArea, DeleteBotRequest } from '../types/bot.types';

/**
 * Botのコントローラークラス
 * US-001-1: Botのサモン機能
 */
export default class BotController {
  private botService: BotService;

  constructor() {
    this.botService = new BotService();
  }

  /**
   * Botをサモンする
   * POST /bots/summon
   */
  async summonBot(req: Request, res: Response): Promise<void> {
    try {
      const { playerId } = req.body as SummonBotRequest;
      const rawCount = (req.body as SummonBotRequest).count;
      const count = rawCount === undefined ? 1 : Number(rawCount);

      if (!playerId) {
        res.status(400).json({ error: 'playerId is required' });
        return;
      }

      if (!Number.isFinite(count) || !Number.isInteger(count) || count < 1 || count > 10) {
        res.status(400).json({ error: BOT_COUNT_RANGE_ERROR });
        return;
      }

      const bots = await this.botService.summonBot(playerId, count);
      res.status(201).json(bots);

    } catch (error) {
      // console.error('Error in summonBot:', error);
      if (error instanceof Error && error.message === 'Permission denied') {
        res.status(403).json({ error: 'Permission denied' });
      } else if (error instanceof Error && error.message === BOT_COUNT_RANGE_ERROR) {
        res.status(400).json({ error: BOT_COUNT_RANGE_ERROR });
      } else {
        res.status(500).json({ error: 'Failed to summon bot' });
      }
    }
  }

  /**
   * 指定したIDのBotを取得する
   * GET /bots/:id
   */
  getBot(req: Request, res: Response): void {
    const { id } = req.params;
    const bot = this.botService.getBot(id);

    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    res.status(200).json(bot.getSummary());
  }

  /**
   * 指定したIDのBotを削除する（物理削除）
   * DELETE /bots/:id
   * US-005: 管理者権限が必要
   */
  async deleteBot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // 管理者権限チェック
      const deleteRequest = BotController.extractDeleteRequest(req);
      if (!deleteRequest.isAdmin) {
        res.status(403).json({ error: 'Forbidden – requires Admin role' });
        return;
      }

      // Botの存在確認
      const bot = this.botService.getBot(id);
      if (!bot) {
        res.status(404).json({ error: 'Not Found' });
        return;
      }

      // 物理削除を実行
      await this.botService.deleteBot(id, deleteRequest.userId);
      res.status(204).send();

    } catch (error) {
      // console.error('Error in deleteBot:', error);
      if (error instanceof Error && error.message === 'BotNotFound') {
        res.status(404).json({ error: 'Not Found' });
      } else {
        res.status(500).json({ error: 'Failed to delete bot' });
      }
    }
  }

  /**
   * リクエストから削除権限情報を抽出する
   * TODO: 実際の認証システム実装時に更新
   * @param req Express Request
   * @returns DeleteBotRequest
   */
  private static extractDeleteRequest(req: Request): DeleteBotRequest {
    // TODO: 実際の認証ヘッダーやJWTトークンから権限を取得
    // 現在はテスト用にヘッダーから簡易的に取得
    const isAdmin = req.headers['x-admin-role'] === 'true';
    const userId = req.headers['x-user-id'] as string;
    
    return {
      isAdmin,
      userId
    };
  }

  /**
   * 全てのBotを取得する
   * GET /bots
   */
  getAllBots(_req: Request, res: Response): void {
    const bots = this.botService.getAllBots();
    res.status(200).json(bots);
  }

  /**
   * 採掘範囲を設定する
   * POST /bots/:id/area
   * リクエストボディは MiningArea（start/end がトップレベル）形式:
   * { "start": { x, y, z }, "end": { x, y, z } }
   * - 正常: 202 Accepted
   * - 無効範囲: 400 + B001 InvalidRange
   * - Bot未存在: 404 + B002 BotNotFound
   */
  setMiningArea(req: Request, res: Response): void {
    const { id } = req.params;
    const bot = this.botService.getBot(id);

    if (!bot) {
      res.status(404).json({ error: { code: 'B002', message: 'Bot not found' } });
      return;
    }

    try {
      // req.body は MiningArea 形式（area プロパティなし、start/end が直下）
      const area = req.body as MiningArea;
      this.botService.setMiningArea(id, area);
      res.status(202).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'InvalidRange') {
        res.status(400).json({ error: { code: 'B001', message: 'InvalidRange' } });
      } else {
        // console.error('Error in setMiningArea:', error);
        res.status(500).json({ error: { code: 'B000', message: 'Failed to set mining area' } });
      }
    }
  }
}
