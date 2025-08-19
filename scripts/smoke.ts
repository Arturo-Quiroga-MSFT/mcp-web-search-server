import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
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

  const client = new Client({ name: 'web-mcp-smoke', version: '0.1.0' }, { capabilities: {} });
  await client.connect(transport);

  const tools = await client.listTools({});
  const toolNames = tools.tools.map(t => t.name);
  console.log('Tools:', toolNames);
  if (!toolNames.includes('web.search')) {
    throw new Error('web.search tool not found');
  }

  const result = await client.callTool({
    name: 'web.search',
    arguments: {
      query: 'latest AI research news',
      provider: process.env.DEFAULT_PROVIDER || 'tavily',
      num: 3,
      searchDepth: 'basic',
      includeRawContent: false,
    },
  });

  console.log('Call result:');
  console.log(JSON.stringify(result, null, 2));

  await transport.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
