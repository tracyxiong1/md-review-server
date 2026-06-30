#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve, dirname, relative } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import mri from 'mri';
import { handleSkillCommand } from './skill-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf-8'));

const SERVER_READY_MESSAGE = 'md-review server started';
const rawArgs = process.argv.slice(2);

// Port validation function
function validatePort(value, name) {
  const port = parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Error: Invalid ${name}: ${value}. Must be between 1 and 65535`);
    process.exit(1);
  }
  return port;
}

// Check if file has markdown extension
function isMarkdownFile(filePath) {
  return filePath.endsWith('.md') || filePath.endsWith('.markdown') || filePath.endsWith('.mdx');
}

// Parse arguments
const args = mri(rawArgs, {
  alias: {
    p: 'port',
    h: 'help',
    v: 'version',
  },
  default: {
    port: '3030',
    host: '127.0.0.1',
    'review-dir': '.reviews',
    open: true,
    readonly: false,
  },
  boolean: ['help', 'version', 'open', 'readonly'],
});

if (args._[0] === 'skill') {
  process.exit(handleSkillCommand({ packageRoot, argv: rawArgs.slice(1) }));
}

// Help message
if (args.help) {
  console.log(`
md-review-server - Review Markdown files with sidecar comments and HTTP APIs

Usage:
  md-review-server [options]              Browse markdown files in current directory
  md-review-server <file> [options]       Preview a specific Markdown file
  md-review-server <directory> [options]  Browse Markdown files in a directory
  md-review-server skill <command>        Install, update, or inspect bundled Codex skills

Options:
  -p, --port <port>          Server port (default: 3030)
  --host <host>              Server host (default: 127.0.0.1)
  --review-dir <dir>         Review sidecar directory (default: .reviews)
  --active-file <file>       Initial file to select in directory mode
  --readonly                 Disable comment write APIs
  --no-open                  Do not open browser automatically
  -h, --help                 Show this help message
  -v, --version              Show version number

Examples:
  md-review-server
  md-review-server docs --active-file guide.v2.md
  md-review-server README.md --port 8080
  md-review-server skill install
  md-review-server skill update --force
`);
  process.exit(0);
}

// Version
if (args.version) {
  console.log(pkg.version);
  process.exit(0);
}

const file = args._[0];
const port = validatePort(args.port, 'port');
const host = args.host;
const shouldOpen = args.open;
const activeFile = args['active-file'] || '';

// Set environment variables
process.env.API_PORT = port;
process.env.API_HOST = host;
process.env.REVIEW_DIR = args['review-dir'];
process.env.ACTIVE_FILE = activeFile;
process.env.READONLY = args.readonly ? 'true' : 'false';

if (host === '0.0.0.0') {
  console.warn('Warning: md-review-server will listen on 0.0.0.0 without authentication.');
}

// If file is specified, validate it
if (file) {
  const filePath = resolve(file);

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = statSync(filePath);

  if (stats.isDirectory()) {
    // Dev mode with specified directory
    process.env.BASE_DIR = filePath;
    if (activeFile) {
      const activePath = resolve(activeFile);
      if (activePath.startsWith(filePath)) {
        process.env.ACTIVE_FILE = relative(filePath, activePath);
      }
    }
    console.log(`Directory: ${filePath}`);
  } else {
    // File mode
    if (!isMarkdownFile(filePath)) {
      console.error(`Error: File must have .md or .markdown extension: ${filePath}`);
      process.exit(1);
    }

    process.env.MARKDOWN_FILE_PATH = filePath;
    console.log(`File: ${filePath}`);
  }
} else {
  // Dev mode - browse all markdown files
  const baseDir = process.cwd();
  process.env.BASE_DIR = baseDir;
  if (activeFile) {
    const activePath = resolve(activeFile);
    if (activePath.startsWith(baseDir)) {
      process.env.ACTIVE_FILE = relative(baseDir, activePath);
    }
  }
  console.log(`Directory: ${baseDir}`);
}

console.log('Starting md-review-server...');
console.log(`   Port: ${port}`);
console.log(`   Host: ${host}`);
console.log(`   Review dir: ${args['review-dir']}`);
if (process.env.ACTIVE_FILE) {
  console.log(`   Active file: ${process.env.ACTIVE_FILE}`);
}
if (args.readonly) {
  console.log('   Readonly: true');
}

// Start server
const serverProcess = spawn('node', ['server/index.js'], {
  cwd: packageRoot,
  stdio: ['inherit', 'pipe', 'inherit'],
  env: process.env,
});

let serverReady = false;
let actualPort = port;

// Wait for server to be ready before opening browser
serverProcess.stdout.on('data', async (data) => {
  process.stdout.write(data);
  const output = data.toString();

  // Extract actual port from "API Server running on http://HOST:XXXX"
  const portMatch = output.match(/API Server running on http:\/\/[^:]+:(\d+)/);
  if (portMatch) {
    actualPort = parseInt(portMatch[1], 10);
  }

  if (!serverReady && output.includes(SERVER_READY_MESSAGE)) {
    serverReady = true;

    if (shouldOpen) {
      const openModule = await import('open');
      const browserHost = host === '0.0.0.0' ? '127.0.0.1' : host;
      openModule.default(`http://${browserHost}:${actualPort}`);
    }
  }
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('\nShutting down...');
  serverProcess.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle server exit
serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
  }
  process.exit(code || 0);
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
