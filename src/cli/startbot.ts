#!/usr/bin/env node
import BotService from '../services/bot.service';

/**
 * CLI: startbot <botId>
 * US-001-4: 自動採掘開始コマンド
 * 
 * 使用例:
 * npx ts-node src/cli/startbot.ts <botId>
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    // eslint-disable-next-line no-console
    console.error('Usage: startbot <botId>');
    process.exit(1);
  }

  const botId = args[0];
  const botService = new BotService();

  try {
    await botService.startMining(botId);
    // eslint-disable-next-line no-console
    console.log('Mining started');
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'BotNotFound':
          // eslint-disable-next-line no-console
          console.error('Error: Bot not found');
          process.exit(1);
          break;
        case 'BotAlreadyMining':
          // eslint-disable-next-line no-console
          console.error('Error: Bot already mining');
          process.exit(1);
          break;
        case 'RangeNotSet':
          // eslint-disable-next-line no-console
          console.error('Error: Range not set');
          process.exit(1);
          break;
        default:
          // eslint-disable-next-line no-console
          console.error('Error: Failed to start mining:', error.message);
          process.exit(1);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('Error: Failed to start mining');
      process.exit(1);
    }
  }
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  main().catch(console.error);
}

export default main;