# Web MCP Server

An MCP server that exposes a `web.search` tool using [Tavily](https://tavily.com/) by default, with optional [SerpAPI](https://serpapi.com/) support.

## Features
- `web.search` tool with parameters: `query` (required), `provider` (tavily|serpapi), and provider-specific options
- Outputs a compact JSON list of results (title, link, snippet/content)
- Runs over stdio for any MCP-compatible client

## Setup
1. Clone this repo (or use the provided folder).
2. Create `.env` from the example and set your API key(s):
   ```bash
   cp .env.example .env
  # For Tavily (default):
  echo "TAVILY_API_KEY=your_tavily_key_here" >> .env
  # Optional: enable SerpAPI usage when provider=serpapi
  echo "SERPAPI_KEY=your_serpapi_key_here" >> .env
   ```
3. Install deps and build:
   ```bash
   npm install
   npm run build
   ```

## Run in dev
```bash
npm run dev
```

## Run compiled
```bash
npm start
```

## Use in VS Code (Continue extension)
1) Install Continue – Coding AI Assistant in VS Code and reload.

2) Build the server so Continue can spawn it:
```bash
npm install
npm run build
```

3) Make sure your Tavily key is available to VS Code. Easiest approach on macOS:
```bash
export TAVILY_API_KEY="your_tavily_key_here"
export DEFAULT_PROVIDER="tavily"   # optional
code .
```
Alternatively, set the values directly in `.continue/config.json` (not recommended for shared repos).

4) Open the Continue side panel:
- It uses `.vscode/settings.json` to load `.continue/config.json`, which runs `node ./dist/index.js` over stdio.
- In Tools/Servers, select the MCP server named `web` and choose the `web.search` tool.
- Example args: `{ "query": "latest AI research news", "num": 3, "provider": "tavily" }`.

Troubleshooting:
- If you see “Missing TAVILY_API_KEY,” confirm VS Code has the env variable (launch VS Code from the same terminal, or add the export to your shell profile and restart VS Code).
- You do not need to run `npm run dev` when using Continue; it will spawn the server on demand.

## Use in Claude Desktop (short note)
1) Build this project so the compiled entry exists at `dist/index.js`.

2) In Claude Desktop, open Settings → Developer → Model Context Protocol (MCP), and add a new stdio server. Use a config like:
```json
{
  "mcpServers": {
    "web": {
      "command": "node",
      "args": ["/Users/arturoquiroga/GITHUB/WEB-MCP-SERVER/dist/index.js"],
      "env": {
        "TAVILY_API_KEY": "${env:TAVILY_API_KEY}",
        "SERPAPI_KEY": "${env:SERPAPI_KEY}",
        "DEFAULT_PROVIDER": "tavily"
      }
    }
  }
}
```
Tip: Absolute paths are recommended. If your repo lives elsewhere, update the `args` path accordingly.

3) Start a new chat in Claude Desktop and verify the `web` tool appears. Call `web.search` with a query (e.g., `latest AI research news`). If you see a missing key error, set `TAVILY_API_KEY` directly in the MCP server env block above.

## Client configuration (example)
For an MCP client that loads a local server over stdio, add an entry similar to:
```json
{
  "mcpServers": {
    "web": {
      "command": "node",
      "args": ["./dist/index.js"],
    "env": { "TAVILY_API_KEY": "${env:TAVILY_API_KEY}", "SERPAPI_KEY": "${env:SERPAPI_KEY}" }
    }
  }
}
```

## Notes
- Requires Node 18+ for built-in `fetch`.
- Tavily free tier and SerpAPI free tier both have quotas/limits.
- You can select a provider per call via `{ provider: "tavily" | "serpapi" }`. Default is Tavily (or set `DEFAULT_PROVIDER` in env).
