import { expect } from 'chai';
import sinon from 'sinon';
import { ToolManager, Tool, Item, MiningEngineLike, InventoryLike } from '../../src/engine/toolManager';
import { ChatNotifierLike } from '../../src/engine/ports';

describe('ToolManager', () => {
  let toolManager: ToolManager;
  let mockChatNotifier: ChatNotifierLike & { sendMessage: sinon.SinonSpy };
  let mockMiningEngine: MiningEngineLike & { stopDig: sinon.SinonSpy; equip: sinon.SinonSpy };
  let mockInventory: InventoryLike & { nextUsableTool: sinon.SinonStub };

  beforeEach(() => {
    mockChatNotifier = {
      sendMessage: sinon.spy()
    } as unknown as ChatNotifierLike & { sendMessage: sinon.SinonSpy };

    mockMiningEngine = {
      stopDig: sinon.spy(),
      equip: sinon.spy()
    } as unknown as MiningEngineLike & { stopDig: sinon.SinonSpy; equip: sinon.SinonSpy };

    mockInventory = {
      nextUsableTool: sinon.stub()
    } as unknown as InventoryLike & { nextUsableTool: sinon.SinonStub };

    toolManager = new ToolManager({
      chatNotifier: mockChatNotifier,
      miningEngine: mockMiningEngine,
      inventory: mockInventory
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

    it('should call stopDig and send chat message when durability reaches 0 and no spare tool', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 1,
        maxDurability: 10
      };
      toolManager.setTool(tool);
      mockInventory.nextUsableTool.returns(null); // 予備ツールなし

      // Act
      toolManager.notifyUse(1);

      // Assert
      expect(mockMiningEngine.stopDig.calledOnce).to.be.true;
      expect(mockChatNotifier.sendMessage.calledOnceWith('ツール切れで停止')).to.be.true;
    });

    it('should auto swap to spare tool when durability reaches 0 and spare tool exists', () => {
      // Arrange
      const tool: Tool = {
        id: 'pickaxe-1',
        durability: 1,
        maxDurability: 10
      };
      const spareTool: Tool = {
        id: 'pickaxe-2',
        durability: 8,
        maxDurability: 10
      };
      toolManager.setTool(tool);
      mockInventory.nextUsableTool.returns(spareTool);

      // Act
      toolManager.notifyUse(1);

      // Assert
      expect(mockMiningEngine.equip.calledOnceWith(spareTool)).to.be.true;
      expect(mockChatNotifier.sendMessage.calledOnceWith('ツール交換完了')).to.be.true;
      expect(mockMiningEngine.stopDig.called).to.be.false;
      
      // 現在のツールが交換されていることを確認
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool).to.deep.equal(spareTool);
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

  describe('pickup', () => {
    it('should auto equip tool when no current tool and item is a tool', () => {
      // Arrange
      const item: Item = {
        id: 'pickaxe-1',
        name: 'Diamond Pickaxe',
        durability: 8,
        maxDurability: 10
      };

      // Act
      toolManager.pickup(item);

      // Assert
      const expectedTool: Tool = {
        id: 'pickaxe-1',
        durability: 8,
        maxDurability: 10
      };
      expect(mockMiningEngine.equip.calledOnceWith(expectedTool)).to.be.true;
      expect(mockChatNotifier.sendMessage.calledOnceWith('ツール Diamond Pickaxe を装備しました')).to.be.true;
      
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool).to.deep.equal(expectedTool);
    });

    it('should not equip when current tool already exists', () => {
      // Arrange
      const existingTool: Tool = {
        id: 'pickaxe-existing',
        durability: 5,
        maxDurability: 10
      };
      toolManager.setTool(existingTool);

      const item: Item = {
        id: 'pickaxe-new',
        name: 'Iron Pickaxe',
        durability: 7,
        maxDurability: 10
      };

      // Act
      toolManager.pickup(item);

      // Assert
      expect(mockMiningEngine.equip.called).to.be.false;
      expect(mockChatNotifier.sendMessage.called).to.be.false;
      
      const currentTool = toolManager.getCurrentTool();
      expect(currentTool).to.deep.equal(existingTool);
    });

    it('should not equip when item is not a tool', () => {
      // Arrange
      const item: Item = {
        id: 'cobblestone',
        name: 'Cobblestone'
        // durability and maxDurability are undefined
      };

      // Act
      toolManager.pickup(item);

      // Assert
      expect(mockMiningEngine.equip.called).to.be.false;
      expect(mockChatNotifier.sendMessage.called).to.be.false;
      expect(toolManager.getCurrentTool()).to.be.null;
    });

    it('should not equip when item has zero durability', () => {
      // Arrange
      const item: Item = {
        id: 'broken-pickaxe',
        name: 'Broken Pickaxe',
        durability: 0,
        maxDurability: 10
      };

      // Act
      toolManager.pickup(item);

      // Assert
      expect(mockMiningEngine.equip.called).to.be.false;
      expect(mockChatNotifier.sendMessage.called).to.be.false;
      expect(toolManager.getCurrentTool()).to.be.null;
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
        inventory: mockInventory,
        initialTool: initialTool
      });

      // Assert
      const currentTool = toolManagerWithInitialTool.getCurrentTool();
      expect(currentTool).to.deep.equal(initialTool);
    });
  });
});