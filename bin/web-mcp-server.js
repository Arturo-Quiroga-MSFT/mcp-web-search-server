#!/usr/bin/env node
// Simple CLI wrapper to start the compiled MCP server.
// - web-mcp-server            # starts server over stdio (blocks)
// - web-mcp-server --help     # usage and exit
// - web-mcp-server --version  # prints version and exit
// Falls back to TypeScript entry if dist is missing.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const userArgs = process.argv.slice(2);

function printHelp() {
  console.log(`web-mcp-server - Web Search MCP server

Usage:
  web-mcp-server            Start the MCP server over stdio (blocks until client disconnects)
  web-mcp-server --help     Show this help and exit
  web-mcp-server --version  Print version and exit
`);
}

function printVersion() {
  try {
    const pkgPath = resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    console.log(pkg.version || '0.0.0');
  } catch {
    console.log('0.0.0');
  }
}

if (userArgs.includes('--help') || userArgs.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (userArgs.includes('--version') || userArgs.includes('-v')) {
  printVersion();
  process.exit(0);
}

const distEntry = resolve(__dirname, '..', 'dist', 'index.js');
const tsEntry = resolve(__dirname, '..', 'src', 'index.ts');

const useDist = existsSync(distEntry);
const cmd = useDist ? process.execPath : 'npx';
const args = useDist ? [distEntry, ...userArgs] : ['-y', 'tsx', tsEntry, ...userArgs];

const child = spawn(cmd, args, { stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
