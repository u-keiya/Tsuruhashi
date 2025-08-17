import { expect } from 'chai';
import sinon from 'sinon';
import Scheduler from '../../src/engine/scheduler';

describe('Scheduler', () => {
  let clock: sinon.SinonFakeTimers;
  let scheduler: Scheduler;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    scheduler = new Scheduler(1000); // 1秒間隔でテスト
  });

  afterEach(() => {
    scheduler.stop();
    clock.restore();
    sinon.restore();
  });

  describe('start', () => {
    it('should execute callback at specified intervals', async () => {
      // Arrange
      const callback = sinon.spy();

      // Act
      scheduler.start(callback);
      
      // Assert - 初回は実行されない
      expect(callback.called).to.be.false;
      
      // 1秒経過
      clock.tick(1000);
      expect(callback.calledOnce).to.be.true;
      
      // さらに1秒経過
      clock.tick(1000);
      expect(callback.calledTwice).to.be.true;
    });

    it('should throw error if already running', () => {
      // Arrange
      const callback = sinon.spy();
      scheduler.start(callback);

      // Act & Assert
      expect(() => scheduler.start(callback)).to.throw('Scheduler is already running');
    });

    it('should handle async callback errors gracefully', async () => {
      // Arrange
      const consoleSpy = sinon.spy(console, 'error');
      const callback = sinon.stub().rejects(new Error('Callback error'));

      // Act
      scheduler.start(callback);
      clock.tick(1000);

      // Wait for async error handling
      await clock.runAllAsync();

      // Assert
      expect(consoleSpy.calledWith('Scheduler callback failed:')).to.be.true;
      consoleSpy.restore();
    });
  });

  describe('stop', () => {
    it('should stop the scheduler', () => {
      // Arrange
      const callback = sinon.spy();
      scheduler.start(callback);

      // Act
      scheduler.stop();
      clock.tick(2000); // 2秒経過

      // Assert
      expect(callback.called).to.be.false;
    });

    it('should be safe to call multiple times', () => {
      // Arrange
      const callback = sinon.spy();
      scheduler.start(callback);

      // Act & Assert - エラーが発生しないことを確認
      scheduler.stop();
      scheduler.stop();
      expect(scheduler.isRunning()).to.be.false;
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(scheduler.isRunning()).to.be.false;
    });

    it('should return true when running', () => {
      // Arrange
      const callback = sinon.spy();

      // Act
      scheduler.start(callback);

      // Assert
      expect(scheduler.isRunning()).to.be.true;
    });

    it('should return false after stopping', () => {
      // Arrange
      const callback = sinon.spy();
      scheduler.start(callback);

      // Act
      scheduler.stop();

      // Assert
      expect(scheduler.isRunning()).to.be.false;
    });
  });

  describe('default interval', () => {
    it('should use 5 minutes as default interval', () => {
      // Arrange
      const defaultScheduler = new Scheduler();
      const callback = sinon.spy();

      // Act
      defaultScheduler.start(callback);
      
      // 5分未満では実行されない
      clock.tick(4 * 60 * 1000 + 59 * 1000); // 4分59秒
      expect(callback.called).to.be.false;
      
      // 5分で実行される
      clock.tick(1000); // 1秒追加で5分
      expect(callback.calledOnce).to.be.true;

      defaultScheduler.stop();
    });
  });
});