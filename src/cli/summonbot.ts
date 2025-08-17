#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

async function summonBot(playerId: string, count: number = 1): Promise<void> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/bots/summon`,
      { playerId, count }
    );
    
    if (response.status === 201) {
      const bots: Array<{ id: string; state: string }> = response.data;
      // eslint-disable-next-line no-console
      console.log(`Bots successfully summoned! count=${bots.length}`);
      bots.forEach((b, i) => {
        // eslint-disable-next-line no-console
        console.log(`[${i}] Bot ID: ${b.id} / State: ${b.state}`);
      });
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // eslint-disable-next-line no-console
      console.error('Failed to summon bot:', error.response?.data?.error || error.message);
    } else {
      // eslint-disable-next-line no-console
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
    (y) =>
      y
        .option('player-id', {
          alias: 'p',
          type: 'string',
          description: 'Player ID',
          demandOption: true
        })
        .option('count', {
          alias: 'c',
          type: 'number',
          description: 'Number of bots to summon',
          default: 1
        }),
    async (argv) => {
      await summonBot(argv['player-id'], argv.count as number);
    }
  )
  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .parse();