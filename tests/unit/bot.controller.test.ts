import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import BotController from '../../src/controllers/bot.controller';
import BotService, { BOT_COUNT_RANGE_ERROR } from '../../src/services/bot.service';
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
    it('should successfully summon a single bot and return 201 status', async () => {
      const playerId = 'validPlayer';
      const botId = 'test-bot-id';
      
      req = {
        body: { playerId }
      };

      const summonStub = sinon.stub(botService, 'summonBot').resolves([{
        id: botId,
        state: BotState.Idle
      }]);

      await botController.summonBot(req as Request, res as Response);

      expect(summonStub.calledOnceWithExactly(playerId, 1)).to.be.true;
      expect(statusStub.calledWith(201)).to.be.true;
      expect(jsonStub.calledWith([{
        id: botId,
        state: BotState.Idle
      }])).to.be.true;
    });

    it('should successfully summon multiple bots and return 201 status', async () => {
      const playerId = 'validPlayer';
      const count = 3;
      const mockBots = [
        { id: 'bot-1', state: BotState.Idle },
        { id: 'bot-2', state: BotState.Idle },
        { id: 'bot-3', state: BotState.Idle }
      ];
      
      req = {
        body: { playerId, count }
      };

      const summonStub = sinon.stub(botService, 'summonBot').resolves(mockBots);

      await botController.summonBot(req as Request, res as Response);

      expect(summonStub.calledOnceWithExactly(playerId, count)).to.be.true;
      expect(statusStub.calledWith(201)).to.be.true;
      expect(jsonStub.calledWith(mockBots)).to.be.true;
    });

    it('should return 400 when playerId is missing', async () => {
      req = {
        body: {}
      };

      const summonSpy = sinon.spy(botService, 'summonBot');
      await botController.summonBot(req as Request, res as Response);

      expect(statusStub.calledWith(400)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'playerId is required'
      })).to.be.true;
      expect(summonSpy.notCalled).to.be.true;
    });

    it('should return 400 when count is too low', async () => {
      req = {
        body: { playerId: 'validPlayer', count: 0 }
      };

      const summonSpy = sinon.spy(botService, 'summonBot');
      await botController.summonBot(req as Request, res as Response);

      expect(statusStub.calledWith(400)).to.be.true;
      expect(jsonStub.calledWith({
        error: BOT_COUNT_RANGE_ERROR
      })).to.be.true;
      expect(summonSpy.notCalled).to.be.true;
    });

    it('should return 400 when count is too high', async () => {
      req = {
        body: { playerId: 'validPlayer', count: 11 }
      };

      const summonSpy = sinon.spy(botService, 'summonBot');
      await botController.summonBot(req as Request, res as Response);

      expect(statusStub.calledWith(400)).to.be.true;
      expect(jsonStub.calledWith({
        error: BOT_COUNT_RANGE_ERROR
      })).to.be.true;
      expect(summonSpy.notCalled).to.be.true;
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

    it('should return 400 when service throws bot count validation error', async () => {
      const playerId = 'validPlayer';
      
      req = {
        body: { playerId, count: 5 }
      };

      sinon.stub(botService, 'summonBot').rejects(new Error('Bot count must be between 1 and 10'));

      await botController.summonBot(req as Request, res as Response);

      expect(statusStub.calledWith(400)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'Bot count must be between 1 and 10'
      })).to.be.true;
    });

    it('should return 500 for other errors', async () => {
      const playerId = 'validPlayer';
      
      req = {
        body: { playerId }
      };

      sinon.stub(botService, 'summonBot').rejects(new Error('Connection failed'));

      await botController.summonBot(req as Request, res as Response);

      expect(statusStub.calledWith(500)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'Failed to summon bot'
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

    it('should return 202 when area is set successfully', async () => {
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

      await botController.setMiningArea(req, res as Response);

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

  describe('deleteBot', () => {
    let sendStub: sinon.SinonStub;

    beforeEach(() => {
      sendStub = sinon.stub();
      (res as any).send = sendStub;
      sendStub.returns(res);
      statusStub.returns(res);
    });

    it('should return 204 when bot is deleted successfully by admin', async () => {
      const botId = 'bot-123';
      const mockBot = { getSummary: () => ({ id: botId, state: 'Idle' }) };

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'getBot').returns(mockBot as any);
      const deleteStub = sinon.stub(botService, 'deleteBot').resolves();

      await botController.deleteBot(req as Request, res as Response);

      expect(statusStub.calledWith(204)).to.be.true;
      expect(sendStub.calledOnce).to.be.true;
      expect(deleteStub.calledWith(botId, 'admin-user')).to.be.true;
    });

    it('should return 403 when user is not admin', async () => {
      const botId = 'bot-123';

      // 非管理者のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'false',
          'x-user-id': 'regular-user'
        }
      };

      const getBotSpy = sinon.spy(botService, 'getBot');
      const deleteSpy = sinon.spy(botService, 'deleteBot');
      await botController.deleteBot(req as Request, res as Response);

      expect(statusStub.calledWith(403)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'Forbidden – requires Admin role'
      })).to.be.true;
      expect(getBotSpy.notCalled).to.be.true;
      expect(deleteSpy.notCalled).to.be.true;
    });

    it('should return 404 when bot is not found', async () => {
      const botId = 'non-existent-bot';

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'getBot').returns(undefined);

      await botController.deleteBot(req as Request, res as Response);

      expect(statusStub.calledWith(404)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'Not Found'
      })).to.be.true;
    });

    it('should return 500 when deletion fails', async () => {
      const botId = 'bot-123';
      const mockBot = { getSummary: () => ({ id: botId, state: 'Idle' }) };

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'getBot').returns(mockBot as any);
      sinon.stub(botService, 'deleteBot').rejects(new Error('Deletion failed'));

      await botController.deleteBot(req as Request, res as Response);

      expect(statusStub.calledWith(500)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'Failed to delete bot'
      })).to.be.true;
    });

    it('should return 404 when service throws BotNotFound error', async () => {
      const botId = 'bot-123';
      const mockBot = { getSummary: () => ({ id: botId, state: 'Idle' }) };

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'getBot').returns(mockBot as any);
      sinon.stub(botService, 'deleteBot').rejects(new Error('BotNotFound'));

      await botController.deleteBot(req as Request, res as Response);

      expect(statusStub.calledWith(404)).to.be.true;
      expect(jsonStub.calledWith({
        error: 'Not Found'
      })).to.be.true;
    });
  });

  describe('startMining', () => {
    let sendStub: sinon.SinonStub;

    beforeEach(() => {
      sendStub = sinon.stub();
      (res as any).send = sendStub;
      sendStub.returns(res);
      statusStub.returns(res);
    });

    it('should return 202 when mining starts successfully', async () => {
      const botId = 'bot-123';

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      const startMiningStub = sinon.stub(botService, 'startMining').resolves();

      await botController.startMining(req as Request, res as Response);

      expect(startMiningStub.calledWith(botId)).to.be.true;
      expect(statusStub.calledWith(202)).to.be.true;
      expect(sendStub.calledOnce).to.be.true;
    });

    it('should return 403 when user is not admin', async () => {
      const botId = 'bot-123';

      // 非管理者のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'false',
          'x-user-id': 'regular-user'
        }
      };

      const startMiningSpy = sinon.spy(botService, 'startMining');

      await botController.startMining(req as Request, res as Response);

      expect(statusStub.calledWith(403)).to.be.true;
      expect(jsonStub.calledWith({
        error: { code: 'B005', message: 'Permission denied' }
      })).to.be.true;
      expect(startMiningSpy.notCalled).to.be.true;
    });

    it('should return 404 when bot is not found', async () => {
      const botId = 'non-existent-bot';

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'startMining').rejects(new Error('BotNotFound'));

      await botController.startMining(req as Request, res as Response);

      expect(statusStub.calledWith(404)).to.be.true;
      expect(jsonStub.calledWith({
        error: { code: 'B002', message: 'Bot not found' }
      })).to.be.true;
    });

    it('should return 409 when bot is already mining', async () => {
      const botId = 'bot-123';

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'startMining').rejects(new Error('BotAlreadyMining'));

      await botController.startMining(req as Request, res as Response);

      expect(statusStub.calledWith(409)).to.be.true;
      expect(jsonStub.calledWith({
        error: { code: 'B003', message: 'Bot already mining' }
      })).to.be.true;
    });

    it('should return 400 when range is not set', async () => {
      const botId = 'bot-123';

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'startMining').rejects(new Error('RangeNotSet'));

      await botController.startMining(req as Request, res as Response);

      expect(statusStub.calledWith(400)).to.be.true;
      expect(jsonStub.calledWith({
        error: { code: 'B004', message: 'Range not set' }
      })).to.be.true;
    });

    it('should return 500 for other errors', async () => {
      const botId = 'bot-123';

      // 管理者権限のヘッダーを設定
      req = {
        params: { id: botId },
        headers: {
          'x-admin-role': 'true',
          'x-user-id': 'admin-user'
        }
      };

      sinon.stub(botService, 'startMining').rejects(new Error('Unexpected error'));

      await botController.startMining(req as Request, res as Response);

      expect(statusStub.calledWith(500)).to.be.true;
      expect(jsonStub.calledWith({
        error: { code: 'B000', message: 'Failed to start mining' }
      })).to.be.true;
    });
  });
});