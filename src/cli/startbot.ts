#!/usr/bin/env node
import http from 'http';
import { URL } from 'url';

/**
 * CLI: startbot <botId>
 * US-001-4: 自動採掘開始コマンド
 *
 * 使用例:
 * npx ts-node src/cli/startbot.ts <botId>
 */
function post(url: URL, headers: Record<string, string>): Promise<{ status: number; body?: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || 80,
        path: `${url.pathname}${url.search}`,
        headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(d as Buffer));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    // eslint-disable-next-line no-console
    console.error('Usage: startbot <botId>');
    process.exit(1);
  }

  const botId = args[0];
  const base = process.env.API_BASE_URL || 'http://localhost:8080';
  const url = new URL(`/bots/${encodeURIComponent(botId)}/start`, base);

  try {
    const { status, body } = await post(url, {
      'x-admin-role': 'true',
      'x-user-id': process.env.ADMIN_USER_ID || 'cli'
    });
    if (status === 202) {
      // eslint-disable-next-line no-console
      console.log('Mining started');
      return;
    }
    // eslint-disable-next-line no-console
    console.error(`Error: Failed to start mining (HTTP ${status})${body ? `: ${body}` : ''}`);
    process.exit(1);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error: Failed to start mining', e instanceof Error ? e.message : '');
    process.exit(1);
  }
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  main().catch(console.error);
}


export default main;