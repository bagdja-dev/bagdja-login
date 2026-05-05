const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseEnvFile(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
  return env;
}

function getPortFromEnvFiles(cwd) {
  const candidates = ['.env.local', '.env'];
  for (const filename of candidates) {
    const fullPath = path.join(cwd, filename);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const env = parseEnvFile(fullPath);
      if (env.PORT) return env.PORT;
    } catch {
      // ignore and continue
    }
  }
  return undefined;
}

function resolvePort() {
  // Prefer an actual environment variable if user already exported it
  if (process.env.PORT && String(process.env.PORT).trim()) {
    return String(process.env.PORT).trim();
  }
  return getPortFromEnvFiles(process.cwd()) || '3000';
}

function run() {
  const mode = process.argv[2]; // "dev" | "start"
  if (mode !== 'dev' && mode !== 'start') {
    console.error('Usage: node scripts/next-port.js <dev|start> [-- <next args...>]');
    process.exit(2);
  }

  const port = resolvePort();
  const passThroughIndex = process.argv.indexOf('--');
  const extraArgs =
    passThroughIndex === -1 ? [] : process.argv.slice(passThroughIndex + 1);

  const args = [mode, '-p', port];
  if (mode === 'dev') args.push('--webpack');
  args.push(...extraArgs);
  const child = spawn('next', args, {
    stdio: 'inherit',
    env: { ...process.env, PORT: port },
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

run();
