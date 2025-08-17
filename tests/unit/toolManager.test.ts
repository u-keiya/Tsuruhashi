import { expect } from 'chai';
import sinon from 'sinon';
import { ToolManager, Tool, MiningEngineLike } from '../../src/engine/toolManager';
import { ChatNotifierLike } from '../../src/engine/ports';

describe('ToolManager', () => {
  let toolManager: ToolManager;
  let mockChatNotifier: ChatNotifierLike & { sendMessage: sinon.SinonSpy };
  let mockMiningEngine: MiningEngineLike & { stopDig: sinon.SinonSpy };

  beforeEach(() => {
    mockChatNotifier = {
      sendMessage: sinon.spy()
    } as unknown as ChatNotifierLike & { sendMessage: sinon.SinonSpy };

    mockMiningEngine = {
      stopDig: sinon.spy()
    } as unknown as MiningEngineLike & { stopDig: sinon.SinonSpy };

    toolManager = new ToolManager({
      chatNotifier: mockChatNotifier,
      miningEngine: mockMiningEngine
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('notifyUse', () => {
    it('should reduce tool durability when notifyUse is called', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 5,
        maxDurability: 10
      };
      toolManager.setTool(tool);

      // Act
      toolManager.notifyUse(2);

      // Assert
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool?.durability).to.equal(3);
    });

    it('should not reduce durability below 0', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 1,
        maxDurability: 10
      };
      toolManager.setTool(tool);

      // Act
      toolManager.notifyUse(5);

      // Assert
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool?.durability).to.equal(0);
    });

    it('should call stopDig and send chat message when durability reaches 0', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 1,
        maxDurability: 10
      };
      toolManager.setTool(tool);

      // Act
      toolManager.notifyUse(1);

      // Assert
      expect(mockMiningEngine.stopDig.calledOnce).to.be.true;
      expect(mockChatNotifier.sendMessage.calledOnceWith('ツール切れで停止')).to.be.true;
    });

    it('should handle case when durability goes from 1 to 0', () => {
      // Arrange - US-001-5 要件: 耐久 1 → 0 になるケースで停止が呼ばれる
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 1,
        maxDurability: 10
      };
      toolManager.setTool(tool);

      // Act
      toolManager.notifyUse(1);

      // Assert
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool?.durability).to.equal(0);
      expect(mockMiningEngine.stopDig.calledOnce).to.be.true;
      expect(mockChatNotifier.sendMessage.calledWith('ツール切れで停止')).to.be.true;
    });

    it('should not call stopDig when durability is still above 0', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 3,
        maxDurability: 10
      };
      toolManager.setTool(tool);

      // Act
      toolManager.notifyUse(1);

      // Assert
      expect(mockMiningEngine.stopDig.called).to.be.false;
      expect(mockChatNotifier.sendMessage.called).to.be.false;
    });

    it('should do nothing when no tool is set', () => {
      // Act
      toolManager.notifyUse(1);

      // Assert
      expect(mockMiningEngine.stopDig.called).to.be.false;
      expect(mockChatNotifier.sendMessage.called).to.be.false;
    });
  });

  describe('getCurrentTool', () => {
    it('should return null when no tool is set', () => {
      // Act
      const result = toolManager.getCurrentTool();

      // Assert
      expect(result).to.be.null;
    });

    it('should return a copy of the current tool', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 5,
        maxDurability: 10
      };
      toolManager.setTool(tool);

      // Act
      const result = toolManager.getCurrentTool();

      // Assert
      expect(result).to.deep.equal(tool);
      expect(result).to.not.equal(tool); // Should be a copy, not the same reference
    });
  });

  describe('setTool', () => {
    it('should set the tool correctly', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 5,
        maxDurability: 10
      };

      // Act
      toolManager.setTool(tool);

      // Assert
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool).to.deep.equal(tool);
    });

    it('should create a copy of the tool to prevent external modification', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 5,
        maxDurability: 10
      };

      // Act
      toolManager.setTool(tool);
      tool.durability = 0; // Modify original

      // Assert
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool?.durability).to.equal(5); // Should not be affected
    });
  });

  describe('constructor with initial tool', () => {
    it('should set initial tool when provided', () => {
      // Arrange
      const initialTool: Tool = {
        id: 'pickaxe-1',
        durability: 8,
        maxDurability: 10
      };

      // Act
      const toolManagerWithInitialTool = new ToolManager({
        chatNotifier: mockChatNotifier,
        miningEngine: mockMiningEngine,
        initialTool: initialTool
      });

      // Assert
      const currentTool = toolManagerWithInitialTool.getCurrentTool();
      expect(currentTool).to.deep.equal(initialTool);
    });
  });
});