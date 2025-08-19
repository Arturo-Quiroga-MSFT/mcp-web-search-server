import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Simple SerpAPI client via fetch
async function serpSearch(query: string, opts: { apiKey: string; engine?: string; num?: number; location?: string }) {
  const params = new URLSearchParams({
    q: query,
    api_key: opts.apiKey,
    engine: opts.engine ?? 'google',
    num: String(opts.num ?? 10),
  });
  if (opts.location) params.set('location', opts.location);
  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SerpAPI error ${res.status}: ${text}`);
  }
  return res.json();
}

// Tavily search client
async function tavilySearch(
  query: string,
  opts: {
    apiKey: string;
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    includeRawContent?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
  }
) {
  const body: Record<string, any> = {
    api_key: opts.apiKey,
    query,
    max_results: opts.maxResults ?? 5,
    search_depth: opts.searchDepth ?? 'basic',
  };
  if (opts.includeAnswer !== undefined) body.include_answer = !!opts.includeAnswer;
  if (opts.includeRawContent !== undefined) body.include_raw_content = !!opts.includeRawContent;
  if (opts.includeDomains?.length) body.include_domains = opts.includeDomains;
  if (opts.excludeDomains?.length) body.exclude_domains = opts.excludeDomains;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily error ${res.status}: ${text}`);
  }
  return res.json();
}

const server = new Server({
  name: 'web-mcp-server',
  version: '0.1.0',
}, {
  capabilities: {
    tools: {},
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
    name: 'web.search',
    description: 'Search the web using Tavily (default) or SerpAPI. Returns results with title, link, and snippet/content.',
      inputSchema: {
        type: 'object',
        properties: {
      query: { type: 'string', description: 'Search query string' },
      provider: { type: 'string', enum: ['tavily', 'serpapi'], description: 'Which provider to use', default: 'tavily' },
      // common
      num: { type: 'number', description: 'Number of results to return', minimum: 1, maximum: 20 },
      // tavily-specific
      searchDepth: { type: 'string', enum: ['basic', 'advanced'], description: 'Tavily search depth', default: 'basic' },
      includeRawContent: { type: 'boolean', description: 'Tavily: include raw page content in results' },
      includeAnswer: { type: 'boolean', description: 'Tavily: ask Tavily to synthesize an answer' },
      includeDomains: { type: 'array', items: { type: 'string' }, description: 'Tavily: restrict to these domains' },
      excludeDomains: { type: 'array', items: { type: 'string' }, description: 'Tavily: exclude these domains' },
      // serpapi-specific
      location: { type: 'string', description: 'SerpAPI: geographic bias (e.g., "Austin, Texas, United States")' },
      engine: { type: 'string', description: 'SerpAPI: engine, e.g., google, bing, duckduckgo', default: 'google' }
        },
        required: ['query']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== 'web.search') {
    return { content: [{ type: 'text', text: `Unknown tool: ${req.params.name}` }] };
  }
  const input = req.params.arguments as any;
  const query = String(input?.query ?? '').trim();
  const provider = (input?.provider ? String(input.provider) : (process.env.DEFAULT_PROVIDER || 'tavily')) as 'tavily' | 'serpapi';
  const num = input?.num ? Number(input.num) : 10;
  if (!query) {
    return { content: [{ type: 'text', text: 'Please provide a non-empty "query".' }] };
  }

  let results: Array<{ title: string; link: string; snippet?: string }> = [];
  let meta: Record<string, any> = { provider };

  if (provider === 'tavily') {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
      return { content: [{ type: 'text', text: 'Missing TAVILY_API_KEY in environment.' }] };
    }
    const searchDepth = (input?.searchDepth === 'advanced' ? 'advanced' : 'basic') as 'basic' | 'advanced';
    const includeRawContent = input?.includeRawContent ? true : false;
    const includeAnswer = input?.includeAnswer ? true : false;
    const includeDomains = Array.isArray(input?.includeDomains) ? input.includeDomains.map(String) : undefined;
    const excludeDomains = Array.isArray(input?.excludeDomains) ? input.excludeDomains.map(String) : undefined;

    const data = await tavilySearch(query, {
      apiKey: tavilyKey,
      maxResults: num,
      searchDepth,
      includeAnswer,
      includeRawContent,
      includeDomains,
      excludeDomains,
    });

    if (Array.isArray(data.results)) {
      for (const r of data.results) {
        const title = r.title || r.url;
        const link = r.url || r.link;
        if (link) {
          const snippet = typeof r.content === 'string' ? r.content : undefined;
          results.push({ title, link, snippet });
        }
      }
    }
    if (data.answer) meta.answer = data.answer;
  } else {
    const serpKey = process.env.SERPAPI_KEY;
    if (!serpKey) {
      return { content: [{ type: 'text', text: 'Missing SERPAPI_KEY in environment.' }] };
    }
    const engine = input?.engine ? String(input.engine) : 'google';
    const location = input?.location ? String(input.location) : undefined;
    const data = await serpSearch(query, { apiKey: serpKey, num, engine, location });

    if (Array.isArray(data.organic_results)) {
      for (const r of data.organic_results) {
        if (r.title && r.link) {
          results.push({ title: r.title, link: r.link, snippet: r.snippet || r.snippet_highlighted_words?.join(' ') });
        }
      }
    }
    if (results.length === 0 && Array.isArray(data.items)) {
      for (const r of data.items) {
        if (r.title && r.link) results.push({ title: r.title, link: r.link, snippet: r.snippet });
      }
    }
    meta.engine = data.search_parameters?.engine ?? engine;
    if (location) meta.location = location;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ query, ...meta, results }, null, 2)
      }
    ]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
