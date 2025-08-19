import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';

function parseArgs() {
  const [, , ...argv] = process.argv;
  const args: Record<string, string | number | boolean> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      rest.push(a);
    }
  }
  return { args, rest };
}

async function main() {
  const { args, rest } = parseArgs();
  const query = (args.query as string) || rest.join(' ');
  if (!query) {
    console.error('Usage: npm run search -- --query "your query" [--provider tavily|serpapi] [--num 5] [--searchDepth basic|advanced]');
    process.exit(1);
  }
  const provider = (args.provider as string) || process.env.DEFAULT_PROVIDER || 'tavily';
  const num = args.num ? Number(args.num) : 5;
  const searchDepth = (args.searchDepth as 'basic' | 'advanced') || 'basic';
  const includeRawContent = args.includeRawContent === 'true' || args.includeRawContent === true;

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: {
      ...getDefaultEnvironment(),
      ...(process.env.TAVILY_API_KEY ? { TAVILY_API_KEY: process.env.TAVILY_API_KEY } : {}),
      ...(process.env.SERPAPI_KEY ? { SERPAPI_KEY: process.env.SERPAPI_KEY } : {}),
      ...(process.env.DEFAULT_PROVIDER ? { DEFAULT_PROVIDER: process.env.DEFAULT_PROVIDER } : {}),
    },
  });

  const client = new Client({ name: 'web-mcp-cli', version: '0.1.0' }, { capabilities: {} });
  await client.connect(transport);

  const result = await client.callTool({
    name: 'web.search',
    arguments: {
      query,
      provider,
      num,
      searchDepth,
      includeRawContent,
    },
  });

  console.log(JSON.stringify(result, null, 2));
  await transport.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
