# MCP Web Search (VS Code Extension)

This extension makes it easy to use your Web MCP server in VS Code:
- Adds a command to register the server in GitHub Copilot Chat user settings.
- Provides a lightweight Chat Participant that can search the web using Tavily or SerpAPI.

## Features
- Command: "MCP Web Search: Register in Copilot Settings" — writes a user-scoped `github.copilot.chat.mcpServers` entry.
- Chat Participant: Ask it web questions directly in the Chat view.
  - Slash command support: `/websearch your query`
  - Settings for provider, API keys, depth, and result count.

## Setup
1. Install the Web MCP server (build once in the repo root):
   - `npm install && npm run build`
   - Optional global CLI: `npm link` → provides `web-mcp-server` command
2. Configure API keys in VS Code settings (Command Palette → Preferences: Open Settings):
   - `mcpWebSearch.tavilyApiKey`
   - `mcpWebSearch.serpapiKey`
   - `mcpWebSearch.defaultProvider` (tavily|serpapi)
3. Register MCP server (optional, for Copilot Chat):
   - Run the command "MCP Web Search: Register in Copilot Settings" and choose global command or absolute path.

## Usage
- Chat Participant (VS Code Chat):
  - Type: `@Web Search` followed by your query, or use `/websearch your query`.
- Copilot Chat with MCP:
  - After registration, ask Copilot to use the `web.search` tool.

## Notes
- The Chat Participant calls Tavily/SerpAPI directly, independent of MCP, so it works even if MCP is not configured.
- MCP registration via the command is global to your user settings and works across VS Code windows.

## License
MIT
