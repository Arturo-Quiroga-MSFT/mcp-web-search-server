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

## Global CLI command (optional)
You can install a small global command so you don’t have to hard-code absolute paths in VS Code settings.

1) Build and link the CLI
```bash
npm install
npm run build
npm link
```

2) Verify it’s on your PATH
```bash
web-mcp-server --version
web-mcp-server --help
```

Notes
- The command starts the MCP server over stdio and will block until the client disconnects (normal for MCP servers).
- If you see “command not found”, ensure your npm global bin is on PATH (for example `~/.npm-global/bin` on macOS) and re-open your terminal.

### PATH setup on macOS (zsh)
If `web-mcp-server` isn’t found after `npm link`, your npm global bin may not be on PATH.

1) Set a user-level npm prefix and add it to PATH:
```bash
npm config set prefix ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

2) Re-link (if needed) and verify:
```bash
cd /Users/arturoquiroga/GITHUB/WEB-MCP-SERVER
npm link
web-mcp-server --version
```

Tips
- You can check the global npm bin folder with: `npm bin -g`
- If VS Code can’t find the command when launched from the Dock, try launching it from a terminal (so it inherits PATH) or reference the absolute command path in your settings.

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

## Use in GitHub Copilot (Agent Mode)
1) Build this project so `dist/index.js` exists:
```bash
npm install
npm run build
```

2) Register the MCP server in Copilot

Option A — via UI (if available in your Copilot build):
- Open the Copilot Chat panel in VS Code.
- Open its settings/gear menu and look for “Model Context Protocol” or “MCP Servers”.
- Add a new server with:
  - Name: `web`
  - Type: `stdio`
  - Command: `node`
  - Args: `./dist/index.js`
  - Env:
    - `TAVILY_API_KEY`: `${env:TAVILY_API_KEY}`
    - `DEFAULT_PROVIDER`: `tavily` (optional)
    - `SERPAPI_KEY`: `${env:SERPAPI_KEY}` (optional)

Option B — via Settings JSON (fallback):
- Open Command Palette → “Preferences: Open Settings (JSON)” and add:
```json
{
  "github.copilot.chat.mcpServers": [
    {
      "name": "web",
      "type": "stdio",
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "TAVILY_API_KEY": "${env:TAVILY_API_KEY}",
        "DEFAULT_PROVIDER": "tavily",
        "SERPAPI_KEY": "${env:SERPAPI_KEY}"
      }
    }
  ]
}
```
Note: Copilot’s MCP setting key may vary by version. If you don’t see this key in the Settings UI, search Copilot settings for “MCP” and adapt accordingly.

Option C — use the global CLI command (no absolute paths):
- After `npm link`, reference the `web-mcp-server` command in user settings:
```json
{
  "github.copilot.chat.mcpServers": [
    {
      "name": "web",
      "type": "stdio",
      "command": "web-mcp-server",
      "args": [],
      "env": {
        "TAVILY_API_KEY": "${env:TAVILY_API_KEY}",
        "DEFAULT_PROVIDER": "tavily",
        "SERPAPI_KEY": "${env:SERPAPI_KEY}"
      }
    }
  ]
}
```
This avoids hard-coding your local filesystem paths and works across workspaces.

3) Make your key available to VS Code:
```bash
export TAVILY_API_KEY="your_tavily_key_here"
export DEFAULT_PROVIDER="tavily"   # optional
code .
```

4) Reload VS Code and test in Copilot Chat
- Ask: “Use the web.search tool to find the latest AI research news.”
- Copilot should call `web.search` and return results. If you see a missing key error, ensure VS Code inherited your environment variables or set them directly in the MCP server env block above.

## Client configuration (example)
For an MCP client that loads a local server over stdio, add an entry similar to:
```json
{
  "mcpServers": {
    "web": {
## Use in VS Code via .vscode/mcp.json
Some MCP-enabled VS Code clients can automatically discover servers defined in `.vscode/mcp.json` and make their tools available in chat.

Prereqs
- Build artifacts exist at `dist/index.js`:
  - `npm install && npm run build`
- API keys in `.env` at the workspace root (loaded by the server via `dotenv`):
  - `TAVILY_API_KEY=...` (required for Tavily)
  - `SERPAPI_KEY=...` (optional, for SerpAPI)
  - `DEFAULT_PROVIDER=tavily` (optional)

What `.vscode/mcp.json` does
- This repo includes `.vscode/mcp.json` with a server named “Web Search”:

  ```jsonc
  {
    "servers": {
      "Web Search": {
        "type": "stdio",
        "command": "node",
        "args": ["./dist/index.js"]
      }
    }
  }
  ```

How to use it in VS Code
1) Open this folder in VS Code after building and setting your `.env`.
2) Use a chat extension that supports MCP and `.vscode/mcp.json` discovery (for example, some builds of GitHub Copilot Chat with MCP support or other MCP-enabled extensions). When supported, the “Web Search” server will be registered automatically.
3) In the chat panel, expand Tools/Servers and select the `web.search` tool, or ask the assistant to “use web.search to …”. Example arguments:

   ```json
   { "query": "latest AI research news", "num": 3, "provider": "tavily" }
   ```

Troubleshooting
- If the server doesn’t appear, your chat client may not yet support `.vscode/mcp.json`. Use the Continue config in this README or register the server manually in your client with:
  - Command: `node`
  - Args: `./dist/index.js`
  - Env: set `TAVILY_API_KEY` (and optionally `SERPAPI_KEY`, `DEFAULT_PROVIDER`)
- If you see “Missing TAVILY_API_KEY,” ensure your key is present in `.env` or exported in the VS Code environment.
- You can also smoke test outside of chat:
  - Run the VS Code task “MCP: Search Web” (Terminal > Run Task…)
  - Or in a terminal: `npm run search -- --query "your query" --provider tavily --num 3`

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
