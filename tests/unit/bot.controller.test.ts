import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import BotController from '../../src/controllers/bot.controller';
import BotService from '../../src/services/bot.service';
import { BotState, BotSummary } from '../../src/types/bot.types';

describe('BotController', () => {
  let botController: BotController;
  let botService: BotService;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;

  beforeEach(() => {
    botController = new BotController();
    // BotServiceのメソッドをスタブ化
    botService = botController['botService'];

    statusStub = sinon.stub();
    jsonStub = sinon.stub();
    
    res = {
      status: statusStub,
      json: jsonStub,
    };

    statusStub.returns(res);
    jsonStub.returns(res);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('summonBot', () => {
    it('should successfully summon a bot and return 201 status', async () => {
      const playerId = 'validPlayer';
      const botId = 'test-bot-id';
      
      req = {
        body: { playerId }
      };

      sinon.stub(botService, 'summonBot').resolves({
        id: botId,
        state: BotState.Idle
      });

      await botController.summonBot(req as Request, res as Response);

      expect(statusStub.calledWith(201)).to.be.true;
      expect(jsonStub.calledWith({
        id: botId,
        state: BotState.Idle
      })).to.be.true;
    });

    it('should return 403 when player has insufficient permissions', async () => {
      const playerId = 'invalidPlayer';
      
      req = {
        body: { playerId }
      };

      sinon.stub(botService, 'summonBot').rejects(new Error('Permission denied'));

      await botController.summonBot(req as Request, res as Response);

      expect(statusStub.calledWith(403)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'Permission denied'
      })).to.be.true;
    });
  });
});