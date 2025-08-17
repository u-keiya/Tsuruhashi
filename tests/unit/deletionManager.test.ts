import { expect } from 'chai';
import sinon from 'sinon';
import DeletionManager from '../../src/engine/deletionManager';
import Bot from '../../src/models/bot.model';
import { BotDeletedEvent, BotState } from '../../src/types/bot.types';

describe('DeletionManager', () => {
  let deletionManager: DeletionManager;
  let mockBot: Bot;
  let disconnectStub: sinon.SinonStub;
  let getSummaryStub: sinon.SinonStub;

  beforeEach(() => {
    deletionManager = new DeletionManager();
    mockBot = new Bot();
    
    // Botのメソッドをスタブ化
    disconnectStub = sinon.stub(mockBot, 'disconnect');
    getSummaryStub = sinon.stub(mockBot, 'getSummary').returns({
      id: 'test-bot-id',
      state: BotState.Idle
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('deleteBot', () => {
    it('should successfully delete a bot', async () => {
      // Arrange
      const deletedBy = 'admin-user';
      let emittedEvent: BotDeletedEvent | null = null;
      
      deletionManager.on('botDeleted', (event: BotDeletedEvent) => {
        emittedEvent = event;
      });

      // Act
      await deletionManager.deleteBot(mockBot, deletedBy);

      // Assert
      expect(disconnectStub.calledOnce).to.be.true;
      expect(emittedEvent).to.not.be.null;
      expect(emittedEvent!.botId).to.equal('test-bot-id');
      expect(emittedEvent!.deletedBy).to.equal(deletedBy);
      expect(emittedEvent!.timestamp).to.be.instanceOf(Date);
    });

    it('should delete bot without deletedBy parameter', async () => {
      // Arrange
      let emittedEvent: BotDeletedEvent | null = null;
      
      deletionManager.on('botDeleted', (event: BotDeletedEvent) => {
        emittedEvent = event;
      });

      // Act
      await deletionManager.deleteBot(mockBot);

      // Assert
      expect(disconnectStub.calledOnce).to.be.true;
      expect(emittedEvent).to.not.be.null;
      expect(emittedEvent!.botId).to.equal('test-bot-id');
      expect(emittedEvent!.deletedBy).to.be.undefined;
    });

    it('should handle bot disconnect failure gracefully', async () => {
      // Arrange
      disconnectStub.throws(new Error('Disconnect failed'));

      // Act & Assert
      try {
        await deletionManager.deleteBot(mockBot);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Bot deletion failed: Disconnect failed');
      }
    });

    it('should emit botDeleted event with correct data', async () => {
      // Arrange
      const deletedBy = 'test-admin';
      let emittedEvent: BotDeletedEvent | null = null;
      
      deletionManager.on('botDeleted', (event: BotDeletedEvent) => {
        emittedEvent = event;
      });

      // Act
      await deletionManager.deleteBot(mockBot, deletedBy);

      // Assert
      expect(emittedEvent).to.not.be.null;
      expect(emittedEvent!.botId).to.equal('test-bot-id');
      expect(emittedEvent!.deletedBy).to.equal(deletedBy);
      expect(emittedEvent!.timestamp).to.be.instanceOf(Date);
      
      // タイムスタンプが現在時刻に近いことを確認（1秒以内）
      const timeDiff = Math.abs(new Date().getTime() - emittedEvent!.timestamp.getTime());
      expect(timeDiff).to.be.lessThan(1000);
    });
  });
});