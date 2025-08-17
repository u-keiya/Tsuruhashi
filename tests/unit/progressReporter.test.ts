import { expect } from 'chai';
import sinon from 'sinon';
import ProgressReporter from '../../src/engine/progressReporter';
import { ChatNotifierLike, StateDBReaderLike } from '../../src/engine/ports';
import { MiningStats } from '../../src/types/bot.types';

describe('ProgressReporter', () => {
  let mockStateDB: StateDBReaderLike & { getMiningStats: sinon.SinonStub };
  let mockChatNotifier: ChatNotifierLike & { sendMessage: sinon.SinonSpy };
  let progressReporter: ProgressReporter;

  beforeEach(() => {
    mockStateDB = {
      getMiningStats: sinon.stub()
    } as unknown as StateDBReaderLike & { getMiningStats: sinon.SinonStub };
    
    mockChatNotifier = {
      sendMessage: sinon.spy()
    } as unknown as ChatNotifierLike & { sendMessage: sinon.SinonSpy };

    progressReporter = new ProgressReporter({
      botId: 'test-bot-id',
      stateDB: mockStateDB,
      chatNotifier: mockChatNotifier
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('tick', () => {
    it('should report progress with correct format', async () => {
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
      await progressReporter.tick();

      // Assert
      expect(mockStateDB.getMiningStats.calledWith('test-bot-id')).to.be.true;
      expect(mockChatNotifier.sendMessage.calledWith(
        '【進捗】80%  (Y=60/50)\n【ツール】残り耐久値 80/100 ・残りツール数 3個'
      )).to.be.true;
    });

    it('should handle 100% progress correctly', async () => {
      // Arrange
      const mockStats: MiningStats = {
        minedBlocks: 100,
        durability: 50,
        maxDurability: 100,
        toolCount: 2,
        currentY: 50,
        targetY: 50
      };
      mockStateDB.getMiningStats.resolves(mockStats);

      // Act
      await progressReporter.tick();

      // Assert
      expect(mockChatNotifier.sendMessage.calledWith(
        '【進捗】100%  (Y=50/50)\n【ツール】残り耐久値 50/100 ・残りツール数 2個'
      )).to.be.true;
    });

    it('should handle StateDB errors gracefully', async () => {
      // Arrange
      const consoleSpy = sinon.spy(console, 'error');
      mockStateDB.getMiningStats.rejects(new Error('DB Error'));

      // Act
      await progressReporter.tick();

      // Assert
      expect(consoleSpy.calledWith('Failed to report progress:')).to.be.true;
      expect(mockChatNotifier.sendMessage.called).to.be.false;
      
      consoleSpy.restore();
    });

    it('should calculate progress correctly for different Y values', async () => {
      // Arrange - Bot moving from Y=70 to Y=50 (target), currently at Y=60
      const mockStats: MiningStats = {
        minedBlocks: 25,
        durability: 90,
        maxDurability: 100,
        toolCount: 5,
        currentY: 60,
        targetY: 50
      };
      mockStateDB.getMiningStats.resolves(mockStats);

      // Act
      await progressReporter.tick();

      // Assert
      expect(mockChatNotifier.sendMessage.calledWith(
        '【進捗】80%  (Y=60/50)\n【ツール】残り耐久値 90/100 ・残りツール数 5個'
      )).to.be.true;
    });
  });
});