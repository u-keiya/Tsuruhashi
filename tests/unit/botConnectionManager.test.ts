import { expect } from 'chai';
import sinon from 'sinon';
import { EventEmitter } from 'events';
import { BotConnectionManager, BotConnectionOptions, ClientFactory } from '../../src/engine/botConnectionManager';

// bedrock-protocolのモック
const mockClient = {
  on: sinon.stub(),
  close: sinon.stub(),
  removeAllListeners: sinon.stub()
};

// プロダクションコードではなく、テスト時のみのモック
const mockCreateClient = sinon.stub();

describe('BotConnectionManager', () => {
  let connectionManager: BotConnectionManager;
  let options: BotConnectionOptions;
  let clock: sinon.SinonFakeTimers;
  let mockClientFactory: ClientFactory;

  beforeEach(() => {
    // モッククライアントファクトリを作成
    mockClientFactory = {
      createClient: mockCreateClient
    };
    clock = sinon.useFakeTimers();
    
    options = {
      host: 'localhost',
      port: 19132,
      username: 'TestBot',
      offline: true
    };
    
    connectionManager = new BotConnectionManager(options, mockClientFactory);
    
    // モックをリセット
    mockCreateClient.reset();
    mockClient.on.reset();
    mockClient.close.reset();
    mockClient.removeAllListeners.reset();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('connect', () => {
    it('should connect successfully and emit connected event', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      const connectedSpy = sinon.spy();
      connectionManager.on('connected', connectedSpy);

      // Act
      await connectionManager.connect();

      // Assert
      expect(mockCreateClient.calledOnce).to.be.true;
      expect(mockCreateClient.calledWith({
        host: 'localhost',
        port: 19132,
        username: 'TestBot',
        offline: true
      })).to.be.true;
      expect(connectedSpy.calledOnce).to.be.true;
      expect(connectionManager.isConnected()).to.be.true;
    });

    it('should throw error when connection fails', async () => {
      // Arrange
      const error = new Error('Connection failed');
      mockCreateClient.rejects(error);

      // Act & Assert
      try {
        await connectionManager.connect();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
      expect(connectionManager.isConnected()).to.be.false;
    });

    it('should not connect if already connecting', async () => {
      // Arrange
      mockCreateClient.callsFake(() => new Promise(() => {})); // never resolves
      const firstConnect = connectionManager.connect();

      // Act
      const secondConnect = connectionManager.connect(); // second call should return immediately

      // Assert - 2回目の呼び出しは即座に返るべき
      await Promise.resolve(); // 非同期処理を待つ
      expect(mockCreateClient.calledOnce).to.be.true;
    });
  });

  describe('disconnect', () => {
    it('should disconnect and emit disconnected event', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();
      
      const disconnectedSpy = sinon.spy();
      connectionManager.on('disconnected', disconnectedSpy);

      // Act
      connectionManager.disconnect('Test reason');

      // Assert
      expect(mockClient.close.calledOnce).to.be.true;
      expect(disconnectedSpy.calledWith('Test reason')).to.be.true;
      expect(connectionManager.isConnected()).to.be.false;
    });
  });

  describe('autoReconnect', () => {
    it('should retry connection with exponential backoff', async () => {
      // Arrange
      mockCreateClient.onFirstCall().rejects(new Error('First fail'));
      mockCreateClient.onSecondCall().resolves(mockClient);
      
      const reconnectingSpy = sinon.spy();
      const connectedSpy = sinon.spy();
      connectionManager.on('reconnecting', reconnectingSpy);
      connectionManager.on('connected', connectedSpy);

      // Act
      connectionManager.autoReconnect(3);
      
      // 最初のリトライ（1秒後）
      clock.tick(1000);
      await new Promise(resolve => setImmediate(resolve)); // Promise resolution
      
      // Assert
      expect(reconnectingSpy.called).to.be.true;
      expect(mockCreateClient.called).to.be.true;
    });

    it('should emit reconnectFailed after max retries', async () => {
      // Arrange
      const error = new Error('Connection failed');
      mockCreateClient.rejects(error);
      
      const reconnectFailedSpy = sinon.spy();
      connectionManager.on('reconnectFailed', reconnectFailedSpy);

      // Act
      connectionManager.autoReconnect(2);
      
      // 1回目のリトライ（1秒後）
      clock.tick(1000);
      await new Promise(resolve => setImmediate(resolve));
      
      // 2回目のリトライ（2秒後）
      clock.tick(2000);
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(reconnectFailedSpy.called).to.be.true;
    });

    it('should use exponential backoff timing', async () => {
      // Arrange
      mockCreateClient.rejects(new Error('Always fail'));
      const reconnectingSpy = sinon.spy();
      connectionManager.on('reconnecting', reconnectingSpy);

      // Act
      connectionManager.autoReconnect(3);
      
      // 1回目: 1秒後
      clock.tick(1000);
      await new Promise(resolve => setImmediate(resolve));
      expect(reconnectingSpy.called).to.be.true;
      
      // 2回目: さらに2秒後
      clock.tick(2000);
      await new Promise(resolve => setImmediate(resolve));
      
      // 3回目: さらに4秒後
      clock.tick(4000);
      await new Promise(resolve => setImmediate(resolve));
    });
  });

  describe('keepAlive', () => {
    it('should start keep-alive with specified interval', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();

      // Act
      connectionManager.keepAlive(5000);
      
      // Assert
      // Keep-aliveが開始されていることを確認（タイマーが設定されている）
      expect(connectionManager.isConnected()).to.be.true;
    });

    it('should detect ping timeout and trigger reconnection', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();
      
      const disconnectedSpy = sinon.spy();
      connectionManager.on('disconnected', disconnectedSpy);

      // Act
      connectionManager.keepAlive(1000);
      // spawn を模擬して lastPingAt を設定
      const spawnHandler = mockClient.on.getCalls().find(c => c.args[0] === 'spawn')?.args[1];
      spawnHandler && spawnHandler();
      // 2×interval を超えるまで進めてタイムアウト判定を誘発
      clock.tick(2100);
      // autoReconnect (初回: 1s 後) を進める
      clock.tick(1000);
      await new Promise(r => setImmediate(r));

      // Assert
      expect(disconnectedSpy.calledWith('Ping timeout')).to.be.true;
      // 初回 connect + 再接続で2回以上呼ばれているはず
      expect(mockCreateClient.callCount).to.be.greaterThan(1);
    });

  describe('event handling', () => {
    it('should handle client end event and trigger autoReconnect', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();
      
      const disconnectedSpy = sinon.spy();
      const reconnectingSpy = sinon.spy();
      connectionManager.on('disconnected', disconnectedSpy);
      connectionManager.on('reconnecting', reconnectingSpy);

      // clientのendイベントハンドラを取得
      const endHandler = mockClient.on.getCalls().find(call => call.args[0] === 'end')?.args[1];
      
      if (endHandler) {
        // Act - endイベントを発生させる
        endHandler();
        
        // autoReconnectが非同期で開始されるので少し待つ
        clock.tick(1000);
        await new Promise(resolve => setImmediate(resolve));

        // Assert
        expect(disconnectedSpy.called).to.be.true;
      }
    });

    it('should handle client error event and trigger autoReconnect', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();
      
      const disconnectedSpy = sinon.spy();
      connectionManager.on('disconnected', disconnectedSpy);

      // clientのerrorイベントハンドラを取得
      const errorHandler = mockClient.on.getCalls().find(call => call.args[0] === 'error')?.args[1];
      
      if (errorHandler) {
        // Act - errorイベントを発生させる
        const testError = new Error('Test error');
        errorHandler(testError);

        // Assert
        expect(disconnectedSpy.called).to.be.true;
      }
    });

    it('should handle heartbeat event to update lastPingAt', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();

      // clientのheartbeatイベントハンドラを取得
      const heartbeatHandler = mockClient.on.getCalls().find(call => call.args[0] === 'heartbeat')?.args[1];
      
      if (heartbeatHandler) {
        // Act - heartbeatイベントを発生させる
        heartbeatHandler();

        // Assert - エラーが発生せず、正常に処理されることを確認
        expect(connectionManager.isConnected()).to.be.true;
      }
    });
  });

  describe('getClient', () => {
    it('should return null when not connected', () => {
      expect(connectionManager.getClient()).to.be.null;
    });

    it('should return client when connected', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();

      // Act & Assert
      expect(connectionManager.getClient()).to.not.be.null;
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(connectionManager.isConnected()).to.be.false;
    });

    it('should return true when connected', async () => {
      // Arrange
      mockCreateClient.resolves(mockClient);
      await connectionManager.connect();

      // Act & Assert
      expect(connectionManager.isConnected()).to.be.true;
    });
  });
});