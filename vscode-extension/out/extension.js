"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
async function tavilySearch(query, opts) {
    const body = {
        api_key: opts.apiKey,
        query,
        max_results: opts.maxResults ?? 5,
        search_depth: opts.searchDepth ?? 'basic'
    };
    const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok)
        throw new Error(`Tavily error ${res.status}`);
    return res.json();
}
async function serpSearch(query, opts) {
    const params = new URLSearchParams({ q: query, api_key: opts.apiKey, engine: opts.engine ?? 'google', num: String(opts.num ?? 10) });
    if (opts.location)
        params.set('location', opts.location);
    const url = `https://serpapi.com/search.json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`SerpAPI error ${res.status}`);
    return res.json();
}
function activate(context) {
    // Command to register MCP server in Copilot settings (kept from earlier)
    const registerCmd = vscode.commands.registerCommand('mcpWebSearch.register', async () => {
        try {
            const config = vscode.workspace.getConfiguration();
            const key = 'github.copilot.chat.mcpServers';
            const existing = config.get(key) ?? [];
            const choice = await vscode.window.showQuickPick([
                { label: 'Use global command (web-mcp-server)', picked: true },
                { label: 'Use absolute path to dist/index.js' },
            ], { placeHolder: 'How should the MCP server be invoked?' });
            if (!choice)
                return;
            let serverEntry;
            if (choice.label.startsWith('Use global')) {
                serverEntry = { name: 'web', type: 'stdio', command: 'web-mcp-server', args: [], env: { TAVILY_API_KEY: '${env:TAVILY_API_KEY}', SERPAPI_KEY: '${env:SERPAPI_KEY}', DEFAULT_PROVIDER: 'tavily' } };
            }
            else {
                const defaultPath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders?.[0]?.uri ?? context.extensionUri, '..', 'dist', 'index.js').fsPath;
                const absPath = await vscode.window.showInputBox({ title: 'Path to dist/index.js', value: defaultPath });
                if (!absPath)
                    return;
                serverEntry = { name: 'web', type: 'stdio', command: 'node', args: [absPath], env: { TAVILY_API_KEY: '${env:TAVILY_API_KEY}', SERPAPI_KEY: '${env:SERPAPI_KEY}', DEFAULT_PROVIDER: 'tavily' } };
            }
            const next = existing.filter((e) => e?.name !== 'web');
            next.push(serverEntry);
            try {
                await config.update(key, next, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('Registered MCP server "web" in user settings. Reload VS Code to apply.');
            }
            catch (err) {
                const msg = String(err?.message ?? err);
                if (/not a registered configuration/i.test(msg)) {
                    // Fallback: open settings.json and merge the entry manually
                    await vscode.commands.executeCommand('workbench.action.openSettingsJson');
                    // Give VS Code a moment to open the editor
                    await new Promise(r => setTimeout(r, 300));
                    const editor = vscode.window.activeTextEditor;
                    if (editor && editor.document && editor.document.languageId === 'json') {
                        const doc = editor.document;
                        let root = {};
                        try {
                            root = JSON.parse(doc.getText() || '{}');
                        }
                        catch {
                            // If parsing fails, fall back to clipboard
                        }
                        if (typeof root === 'object' && root) {
                            const arr = Array.isArray(root[key]) ? root[key] : [];
                            const merged = arr.filter((e) => e?.name !== 'web');
                            merged.push(serverEntry);
                            root[key] = merged;
                            const pretty = JSON.stringify(root, null, 2) + (doc.isDirty ? '' : '\n');
                            const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
                            await editor.edit(edit => edit.replace(fullRange, pretty));
                            await doc.save();
                            vscode.window.showInformationMessage('Registered MCP server "web" by editing settings.json. Reload VS Code to apply.');
                            return;
                        }
                    }
                    // Clipboard fallback
                    const snippet = JSON.stringify({ [key]: [serverEntry] }, null, 2);
                    await vscode.env.clipboard.writeText(snippet);
                    vscode.window.showWarningMessage('Could not update settings programmatically. JSON snippet copied to clipboard. Paste it into your User settings.json at the top level.');
                }
                else {
                    throw err;
                }
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`MCP registration failed: ${err?.message ?? String(err)}`);
        }
    });
    // Minimal chat participant using VS Code Chat API
    try {
        // @ts-ignore - createChatParticipant is available in VS Code with Chat API
        const participant = vscode.chat?.createChatParticipant?.('mcp-web-search.participant', async (request, _context, stream, token) => {
            const cfg = vscode.workspace.getConfiguration();
            const provider = (cfg.get('mcpWebSearch.defaultProvider') ?? 'tavily');
            const maxResults = cfg.get('mcpWebSearch.maxResults') ?? 5;
            const searchDepth = (cfg.get('mcpWebSearch.searchDepth') ?? 'basic');
            const tavilyKey = cfg.get('mcpWebSearch.tavilyApiKey') || process.env.TAVILY_API_KEY;
            const serpKey = cfg.get('mcpWebSearch.serpapiKey') || process.env.SERPAPI_KEY;
            let promptText = String(request?.prompt ?? '').trim();
            // Support slash command form: "/websearch your query"
            if (/^\s*\/websearch\b/i.test(promptText)) {
                promptText = promptText.replace(/^\s*\/websearch\b\s*/i, '');
            }
            const query = promptText;
            if (!query) {
                stream.markdown('Please provide a search query.');
                return;
            }
            try {
                if (provider === 'tavily') {
                    if (!tavilyKey)
                        throw new Error('Missing Tavily API key. Configure mcpWebSearch.tavilyApiKey.');
                    const data = await tavilySearch(query, { apiKey: tavilyKey, maxResults, searchDepth });
                    const results = Array.isArray(data.results) ? data.results.slice(0, maxResults) : [];
                    for (const r of results) {
                        stream.markdown(`- [${r.title || r.url}](${r.url || r.link})`);
                    }
                    if (data.answer) {
                        stream.markdown(`\n> ${data.answer}`);
                    }
                }
                else {
                    if (!serpKey)
                        throw new Error('Missing SerpAPI key. Configure mcpWebSearch.serpapiKey.');
                    const data = await serpSearch(query, { apiKey: serpKey, num: maxResults });
                    const results = Array.isArray(data.organic_results) ? data.organic_results.slice(0, maxResults) : [];
                    for (const r of results) {
                        if (r.title && r.link)
                            stream.markdown(`- [${r.title}](${r.link})`);
                    }
                }
            }
            catch (e) {
                stream.markdown(`Error: ${e?.message ?? String(e)}`);
            }
        });
        if (participant) {
            participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');
        }
    }
    catch {
        // Chat API may not be available; ignore
    }
    context.subscriptions.push(registerCmd);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map