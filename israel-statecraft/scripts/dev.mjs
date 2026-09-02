// One-command local development: starts the game server and the Vite client.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(name, args) {
  const p = spawn(npx, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  p.on('exit', (code) => {
    console.log(`[dev] ${name} exited with ${code}`);
    process.exit(code ?? 0);
  });
  return p;
}

run('server', ['tsx', 'watch', 'app/server/main.ts']);
setTimeout(() => run('client', ['vite', 'app/client', '--port', '5173']), 800);
