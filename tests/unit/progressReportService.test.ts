import { expect } from 'chai';
import sinon from 'sinon';
import ProgressReportService from '../../src/engine/progressReportService';
import { ChatNotifierLike, StateDBReaderLike } from '../../src/engine/ports';
import { MiningStats } from '../../src/types/bot.types';

describe('ProgressReportService', () => {
  let mockStateDB: StateDBReaderLike & { getMiningStats: sinon.SinonStub };
  let mockChatNotifier: ChatNotifierLike & { sendMessage: sinon.SinonSpy };
  let progressReportService: ProgressReportService;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    
    mockStateDB = {
      getMiningStats: sinon.stub()
    } as unknown as StateDBReaderLike & { getMiningStats: sinon.SinonStub };
    
    mockChatNotifier = {
      sendMessage: sinon.spy()
    } as unknown as ChatNotifierLike & { sendMessage: sinon.SinonSpy };

    progressReportService = new ProgressReportService({
      botId: 'test-bot-id',
      stateDB: mockStateDB,
      chatNotifier: mockChatNotifier,
      intervalMs: 1000 // 1秒間隔でテスト
    });
  });

  afterEach(() => {
    progressReportService.stop();
    clock.restore();
    sinon.restore();
  });

  describe('start and stop', () => {
    it('should start periodic reporting', async () => {
      // Arrange
      const mockStats: MiningStats = {
        minedBlocks: 50,
        durability: 80,
        maxDurability: 100,
        toolCount: 3,
        currentY: 60,
        targetY: 50
      };
      mockStateDB.getMiningStats.resolves(mockStats);

      // Act
      progressReportService.start();
      
      // Assert - 初回は実行されない
      expect(mockChatNotifier.sendMessage.called).to.be.false;
      
      // 1秒経過で実行される
      // tickAsync を使うことで、タイマーを進めると同時に
      // 非同期コールバック (progressReporter.tick) の完了を待機できる
      await clock.tickAsync(1000);
      
      expect(mockStateDB.getMiningStats.calledWith('test-bot-id')).to.be.true;
      expect(mockChatNotifier.sendMessage.calledOnce).to.be.true;
    });

    it('should stop periodic reporting', async () => {
      // Arrange
      const mockStats: MiningStats = {
        minedBlocks: 50,
        durability: 80,
        maxDurability: 100,
        toolCount: 3,
        currentY: 60,
        targetY: 50
      };
      mockStateDB.getMiningStats.resolves(mockStats);

      // Act
      progressReportService.start();
      progressReportService.stop();
      
      // 時間が経過しても実行されない
      clock.tick(2000);
      await clock.runAllAsync();

      // Assert
      expect(mockChatNotifier.sendMessage.called).to.be.false;
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(progressReportService.isRunning()).to.be.false;
    });

    it('should return true when running', () => {
      progressReportService.start();
      expect(progressReportService.isRunning()).to.be.true;
    });

    it('should return false after stopping', () => {
      progressReportService.start();
      progressReportService.stop();
      expect(progressReportService.isRunning()).to.be.false;
    });
  });

  describe('reportNow', () => {
    it('should execute immediate progress report', async () => {
      // Arrange
      const mockStats: MiningStats = {
        minedBlocks: 75,
        durability: 60,
        maxDurability: 100,
        toolCount: 2,
        currentY: 55,
        targetY: 50
      };
      mockStateDB.getMiningStats.resolves(mockStats);

      // Act
      await progressReportService.reportNow();

      // Assert
      expect(mockStateDB.getMiningStats.calledWith('test-bot-id')).to.be.true;
      expect(mockChatNotifier.sendMessage.calledWith(
        '【進捗】90%  (Y=55/50)\n【ツール】残り耐久値 60/100 ・残りツール数 2個'
      )).to.be.true;
    });

    it('should work independently of scheduler', async () => {
      // Arrange
      const mockStats: MiningStats = {
        minedBlocks: 25,
        durability: 90,
        maxDurability: 100,
        toolCount: 5,
        currentY: 65,
        targetY: 50
      };
      mockStateDB.getMiningStats.resolves(mockStats);

      // Act - スケジューラーを開始せずに手動実行
      await progressReportService.reportNow();

      // Assert
      expect(mockChatNotifier.sendMessage.calledOnce).to.be.true;
      expect(progressReportService.isRunning()).to.be.false;
    });
  });

  describe('error handling', () => {
    it('should handle errors in scheduled reporting gracefully', async () => {
      // Arrange
      const consoleSpy = sinon.spy(console, 'error');
      mockStateDB.getMiningStats.rejects(new Error('DB Error'));

      // Act
      progressReportService.start();
      clock.tick(1000);
      await clock.runAllAsync();

      // Assert
      expect(consoleSpy.called).to.be.true;
      expect(mockChatNotifier.sendMessage.called).to.be.false;
      
      consoleSpy.restore();
    });
  });
});