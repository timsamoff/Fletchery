#!/usr/bin/env node
// Starts Fletchery for the story project in the current directory.
import { spawn } from 'node:child_process';
import { createServer } from '../server/server.js';

const args = process.argv.slice(2);
let startPort = 3000;
let open = true;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--no-open') open = false;
  else if (arg === '--port') startPort = Number(args[++i]);
  else if (arg.startsWith('--port=')) startPort = Number(arg.slice(7));
  else if (arg === '--help' || arg === '-h') {
    console.log('Usage: fletchery [--port <number>] [--no-open]\n\nRun it from a story project folder. The bible is kept in ./story-bible/.');
    process.exit(0);
  } else {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  }
}

if (!Number.isInteger(startPort) || startPort < 1 || startPort > 65535) {
  console.error('The port must be a whole number from 1 to 65535.');
  process.exit(1);
}

const projectDir = process.cwd();
const port = await createServer(projectDir).listen(startPort);
// 127.0.0.1 rather than localhost, so the browser can't reach a different
// server that happens to hold the same port on the IPv6 address.
const url = `http://127.0.0.1:${port}/`;

console.log(`Fletchery is running for ${projectDir}`);
console.log(`Open ${url}`);
console.log('Press Ctrl+C to stop.');

if (open) {
  const [cmd, cmdArgs] =
    process.platform === 'win32' ? ['explorer.exe', [url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
}
