import { expect } from 'chai';
import sinon from 'sinon';
import BotService, { BOT_COUNT_RANGE_ERROR } from '../../src/services/bot.service';
import Bot from '../../src/models/bot.model';
import { BotState } from '../../src/types/bot.types';

describe('BotService', () => {
  let botService: BotService;
  let mockBot: sinon.SinonStubbedInstance<Bot>;

  beforeEach(() => {
    botService = new BotService();
    mockBot = sinon.createStubInstance(Bot);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('summonBot', () => {
    it('should throw error when count is invalid (too low)', async () => {
      const playerId = 'test-player';
      
      try {
        await botService.summonBot(playerId, 0);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal(BOT_COUNT_RANGE_ERROR);
      }
    });

    it('should throw error when count is invalid (too high)', async () => {
      const playerId = 'test-player';
      
      try {
        await botService.summonBot(playerId, 11);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal(BOT_COUNT_RANGE_ERROR);
      }
    });

    // Note: Bot constructor mocking is complex due to bedrock-protocol dependency
    // The validation logic is tested above, and integration tests would verify actual Bot creation
    it('should summon N bots and return summaries (happy path)', async () => {
      const playerId = 'player-1';
      const count = 3;

      let botIdx = 0;
      // connectが呼ばれるたびに、インスタンスにユニークなインデックスを付与
      sinon.stub(Bot.prototype, 'connect').callsFake(async function () {
        // @ts-ignore
        this._testIdx = botIdx++;
        return Promise.resolve();
      });

      // getSummaryは、インスタンスに付与されたインデックスを使ってIDを生成
      sinon.stub(Bot.prototype, 'getSummary').callsFake(function () {
        // @ts-ignore
        return { id: `bot-${this._testIdx}`, state: BotState.Idle };
      });

      // disconnectはそのまま
      sinon.stub(Bot.prototype, 'disconnect').resolves();

      const result = await botService.summonBot(playerId, count);

      expect(result).to.have.length(count);
      expect((botService as any).bots.size).to.equal(count);

      // 結果のIDが順不同で正しいことを確認
      const resultIds = result.map(s => s.id).sort();
      expect(resultIds).to.deep.equal(['bot-0', 'bot-1', 'bot-2']);

      // サービスに登録されたBotのIDも確認
      const botIds = Array.from((botService as any).bots.keys()).sort();
      expect(botIds).to.deep.equal(['bot-0', 'bot-1', 'bot-2']);
    });
  });

  describe('getBot', () => {
    it('should return bot when it exists', () => {
      const botId = 'test-bot-id';
      const mockSummary = { id: botId, state: BotState.Idle };
      
      mockBot.getSummary.returns(mockSummary);
      
      // Botをサービスに追加
      (botService as any).bots.set(botId, mockBot);
      
      const result = botService.getBot(botId);
      expect(result).to.equal(mockBot);
    });

    it('should return undefined when bot does not exist', () => {
      const result = botService.getBot('non-existent-bot');
      expect(result).to.be.undefined;
    });
  });

  describe('getAllBots', () => {
    it('should return all bot summaries', () => {
      const mockSummaries = [
        { id: 'bot-1', state: BotState.Idle },
        { id: 'bot-2', state: BotState.Mining }
      ];

      const mockBot1 = sinon.createStubInstance(Bot);
      const mockBot2 = sinon.createStubInstance(Bot);
      
      mockBot1.getSummary.returns(mockSummaries[0]);
      mockBot2.getSummary.returns(mockSummaries[1]);

      (botService as any).bots.set('bot-1', mockBot1);
      (botService as any).bots.set('bot-2', mockBot2);

      const result = botService.getAllBots();
      expect(result).to.have.length(2);
      expect(result).to.deep.equal(mockSummaries);
    });

    it('should return empty array when no bots exist', () => {
      const result = botService.getAllBots();
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('startMining', () => {
    let mockBot: sinon.SinonStubbedInstance<any>;
    let botId: string;

    beforeEach(() => {
      botId = 'test-bot-id';
      mockBot = {
        getState: sinon.stub(),
        getMiningArea: sinon.stub(),
        getMiningEngine: sinon.stub(),
        getClient: sinon.stub(),
        getPosition: sinon.stub(),
        setMiningEngine: sinon.stub(),
        setState: sinon.stub(),
        getSummary: sinon.stub()
      };
      
      (botService as any).bots.set(botId, mockBot);
    });

    it('should throw BotNotFound when bot does not exist', async () => {
      try {
        await botService.startMining('non-existent-bot');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('BotNotFound');
      }
    });

    it('should throw BotAlreadyMining when bot is not Idle', async () => {
      mockBot.getState.returns(BotState.Mining);
      
      try {
        await botService.startMining(botId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('BotAlreadyMining');
      }
    });

    it('should throw RangeNotSet when mining area is not set', async () => {
      mockBot.getState.returns(BotState.Idle);
      mockBot.getMiningArea.returns(null);
      
      try {
        await botService.startMining(botId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('RangeNotSet');
      }
    });

    it('should successfully start mining when conditions are met', async () => {
      const miningArea = {
        start: { x: 0, y: 60, z: 0 },
        end: { x: 10, y: 70, z: 10 }
      };
      const position = { x: 5, y: 64, z: 5 };
      const mockClient = {};
      const mockMiningEngine = {
        setMiningArea: sinon.stub(),
        setTarget: sinon.stub()
      };

      mockBot.getState.returns(BotState.Idle);
      mockBot.getMiningArea.returns(miningArea);
      mockBot.getMiningEngine.returns(null);
      mockBot.getClient.returns(mockClient);
      mockBot.getPosition.returns(position);
      mockBot.getSummary.returns({ id: botId, state: BotState.Idle });

      await botService.startMining(botId);

      expect(mockBot.setState.calledWith(BotState.Moving)).to.be.true;
      expect(mockBot.setMiningEngine.calledOnce).to.be.true;
    });

    it('should reuse existing MiningEngine when available', async () => {
      const miningArea = {
        start: { x: 0, y: 60, z: 0 },
        end: { x: 10, y: 70, z: 10 }
      };
      const mockMiningEngine = {
        setMiningArea: sinon.stub(),
        setTarget: sinon.stub()
      };

      mockBot.getState.returns(BotState.Idle);
      mockBot.getMiningArea.returns(miningArea);
      mockBot.getMiningEngine.returns(mockMiningEngine);

      await botService.startMining(botId);

      expect(mockMiningEngine.setMiningArea.calledWith(miningArea)).to.be.true;
      expect(mockMiningEngine.setTarget.calledWith(miningArea.start)).to.be.true;
      expect(mockBot.setState.calledWith(BotState.Moving)).to.be.true;
    });
  });
});