#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

type Coord = { x: number; y: number; z: number };
type MiningArea = { start: Coord; end: Coord };

async function setArea(botId: string, area: MiningArea): Promise<void> {
  try {
    const resp = await axios.post(`${API_BASE_URL}/bots/${botId}/area`, area, {
      validateStatus: () => true
    });

    if (resp.status === 202) {
      // eslint-disable-next-line no-console
      console.log('Area set');
      return;
    }

    // エラーフォーマット { error: { code, message } } に対応
    const code = (resp.data && resp.data.error && resp.data.error.code) || 'UNKNOWN';
    const message =
      (resp.data && resp.data.error && resp.data.error.message) ||
      resp.statusText ||
      'Failed';
    // eslint-disable-next-line no-console
    console.error(`Failed to set area: ${code} ${message}`);
    process.exit(1);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      // eslint-disable-next-line no-console
      console.error('HTTP error:', e.response?.data || e.message);
    } else {
      // eslint-disable-next-line no-console
      console.error('Unexpected error:', e);
    }
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command(
    'set',
    'Set mining area for a bot',
    (y) =>
      y
        .option('bot-id', { alias: 'b', type: 'string', demandOption: true, describe: 'Target bot ID' })
        .option('start-x', { type: 'number', demandOption: true })
        .option('start-y', { type: 'number', demandOption: true })
        .option('start-z', { type: 'number', demandOption: true })
        .option('end-x', { type: 'number', demandOption: true })
        .option('end-y', { type: 'number', demandOption: true })
        .option('end-z', { type: 'number', demandOption: true }),
    async (argv) => {
      const botId = argv['bot-id'] as string;

      const area: MiningArea = {
        start: {
          x: Number(argv['start-x']),
          y: Number(argv['start-y']),
          z: Number(argv['start-z'])
        },
        end: {
          x: Number(argv['end-x']),
          y: Number(argv['end-y']),
          z: Number(argv['end-z'])
        }
      };

      await setArea(botId, area);
    }
  )
  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .parse();