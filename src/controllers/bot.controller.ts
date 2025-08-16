import { Request, Response } from 'express';
import BotService from '../services/bot.service';
import { SummonBotRequest, MiningArea } from '../types/bot.types';

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

      if (!playerId) {
        res.status(400).json({ error: 'playerId is required' });
        return;
      }

      const bot = await this.botService.summonBot(playerId);
      res.status(201).json(bot);

    } catch (error) {
      console.error('Error in summonBot:', error);
      if (error instanceof Error && error.message === 'Permission denied') {
        res.status(403).json({ error: 'Permission denied' });
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
   * 指定したIDのBotを削除する
   * DELETE /bots/:id
   */
  deleteBot(req: Request, res: Response): void {
    const { id } = req.params;
    const bot = this.botService.getBot(id);

    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    this.botService.deleteBot(id);
    res.status(204).send();
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
        console.error('Error in setMiningArea:', error);
        res.status(500).json({ error: { code: 'B000', message: 'Failed to set mining area' } });
      }
    }
  }
}
