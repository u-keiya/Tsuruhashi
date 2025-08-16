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
  describe('setMiningArea', () => {
    let sendStub: sinon.SinonStub;

    beforeEach(() => {
      // 既存の beforeEach で res/status/json は設定済み。ここで send を追加
      sendStub = sinon.stub();
      (res as any).send = sendStub;

      // chainable を維持
      sendStub.returns(res);
      statusStub.returns(res);
    });

    it('should return 202 when area is set successfully', () => {
      const botId = 'bot-123';
      const area = {
        start: { x: 0, y: 60, z: 0 },
        end: { x: 10, y: 70, z: 10 }
      };

      // Bot が存在し、設定成功するケース
      sinon.stub(botService, 'getBot').returns({} as any);
      sinon.stub(botService, 'setMiningArea').returns();

      const req = {
        params: { id: botId },
        body: area
      } as unknown as Request;

      botController.setMiningArea(req, res as Response);

      expect(statusStub.calledWith(202)).to.be.true;
      expect(sendStub.calledOnce).to.be.true;
    });

    it('should return 400 with B001 when range is invalid', () => {
      const botId = 'bot-123';
      const area = {
        start: { x: NaN, y: 60, z: 0 }, // invalid
        end: { x: 10, y: 70, z: 10 }
      };

      sinon.stub(botService, 'getBot').returns({} as any);
      sinon.stub(botService, 'setMiningArea').throws(new Error('InvalidRange'));

      const req = {
        params: { id: botId },
        body: area
      } as unknown as Request;

      botController.setMiningArea(req, res as Response);

      expect(statusStub.calledWith(400)).to.be.true;
      expect(jsonStub.calledWithMatch({
        error: { code: 'B001', message: 'InvalidRange' }
      })).to.be.true;
    });

    it('should return 404 with B002 when bot not found', () => {
      const botId = 'missing-bot';
      const area = {
        start: { x: 0, y: 60, z: 0 },
        end: { x: 10, y: 70, z: 10 }
      };

      sinon.stub(botService, 'getBot').returns(undefined);

      const req = {
        params: { id: botId },
        body: area
      } as unknown as Request;

      botController.setMiningArea(req, res as Response);

      expect(statusStub.calledWith(404)).to.be.true;
      expect(jsonStub.calledWithMatch({
        error: { code: 'B002' }
      })).to.be.true;
    });
    it('should return 500 with B000 on unexpected errors', () => {
      const botId = 'bot-123';
      const area = {
        start: { x: 0, y: 60, z: 0 },
        end: { x: 10, y: 70, z: 10 }
      };

      sinon.stub(botService, 'getBot').returns({} as any);
      sinon.stub(botService, 'setMiningArea').throws(new Error('Boom'));

      const req = {
        params: { id: botId },
        body: area
      } as unknown as Request;

      botController.setMiningArea(req, res as Response);

      expect(statusStub.calledWith(500)).to.be.true;
      expect(jsonStub.calledWithMatch({
        error: { code: 'B000', message: 'Failed to set mining area' }
      })).to.be.true;
    });
  });
});