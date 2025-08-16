#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

async function summonBot(playerId: string): Promise<void> {
  try {
    const response = await axios.post(`${API_BASE_URL}/bots/summon`, { playerId });
    
    if (response.status === 201) {
      const bot = response.data;
      console.log('Bot successfully summoned!');
      console.log(`Bot ID: ${bot.id}`);
      console.log(`State: ${bot.state}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to summon bot:', error.response?.data?.error || error.message);
    } else {
      console.error('An unexpected error occurred:', error);
    }
    process.exit(1);
  }
}

// コマンドライン引数の解析
yargs(hideBin(process.argv))
  .command(
    'summon',
    'Summon a new bot',
    (yargs) => {
      return yargs.option('player-id', {
        alias: 'p',
        type: 'string',
        description: 'Player ID',
        demandOption: true
      });
    },
    async (argv) => {
      await summonBot(argv['player-id']);
    }
  )
  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .argv;