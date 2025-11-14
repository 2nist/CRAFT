#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const ENV_KEYS = ['CTH_RUNTIME_ROOT','CRAFT_TOOLS_RUNTIME_ROOT','CRAFT_TOOLS_NAS_ROOT'];
const argv = process.argv.slice(2);
const args = parseArgs(argv);
const resolvedRoot = args.root ?? ENV_KEYS.map(k => process.env[k]).find(Boolean) ?? null;
const diagnostics = [];
let exitCode = 0;

async function main() {
  await section('Environment', async () => ({
    platform: process.platform,
    node: process.version,
    user: os.userInfo().username,
    envKey: ENV_KEYS.find(k => process.env[k]) || null,
    runtimeRoot: resolvedRoot
  }));

  if (!resolvedRoot) {
    failHard('No runtime root resolved. Set CTH_RUNTIME_ROOT or use --root <path>');
  }

  const host = args.host ?? extractHost(resolvedRoot) ?? null;
  if (!args['skip-ping'] && host && process.platform === 'win32') {
    await section(`Ping ${host}`, async () => {
      try {
        execSync(`ping -n 1 ${host}`, { stdio: 'pipe' });
        return { host };
      } catch (err) {
        throw new Error(`Ping failed: ${err.message}`);
      }
    });
  }

  await section('Directory access', async () => {
    await fs.access(resolvedRoot);
    const stat = await fs.stat(resolvedRoot);
    const entries = await fs.readdir(resolvedRoot);
    return { path: resolvedRoot, isDirectory: stat.isDirectory(), entries: entries.slice(0,5) };
  });

  for (const dir of ['database','OUTPUT','Settings']) {
    await section(`Check ${dir}`, async () => {
      const target = path.join(resolvedRoot, dir);
      const stat = await fs.stat(target);
      return { path: target, exists: true, isDirectory: stat.isDirectory() };
    });
  }

  for (const db of ['server.db','generated_numbers.db']) {
    await section(`Inspect ${db}`, async () => {
      const target = path.join(resolvedRoot, 'database', db);
      const stat = await fs.stat(target);
      return { path: target, size: stat.size, modified: stat.mtime.toISOString() };
    });
  }

  if (!args['skip-write']) {
    await section('Read/Write test', async () => {
      const diagDir = path.join(resolvedRoot, '.cth_diag');
      await fs.mkdir(diagDir, { recursive: true });
      const file = path.join(diagDir, `nas-${Date.now()}.tmp`);
      await fs.writeFile(file, new Date().toISOString());
      await fs.unlink(file);
      return { path: diagDir };
    });
  }

  if (process.platform === 'win32') {
    await section('Stored credentials', async () => {
      try {
        const output = execSync('cmdkey /list', { encoding: 'utf8' });
        return { hasCraftAutoEntry: output.includes('CraftAuto-Sales'), raw: args.json ? output : undefined };
      } catch (err) {
        throw new Error(`cmdkey failed: ${err.message}`);
      }
    });

    await section('Active mappings', async () => {
      try {
        const output = execSync('net use', { encoding: 'utf8' });
        const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        return { entries: lines.slice(0,20) };
      } catch (err) {
        throw new Error(`net use failed: ${err.message}`);
      }
    });
  }

  finish();
}

main().catch(err => {
  diagnostics.push({ label: 'fatal', status: 'fail', error: String(err) });
  exitCode = exitCode || 2;
  finish();
});

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root' && argv[i+1]) { out.root = argv[++i]; continue; }
    if (a === '--host' && argv[i+1]) { out.host = argv[++i]; continue; }
    if (a === '--skip-ping') { out['skip-ping'] = true; continue; }
    if (a === '--skip-write') { out['skip-write'] = true; continue; }
    if (a === '--json') { out.json = true; continue; }
    if (a === '--help' || a === '-h') { out.help = true; }
  }
  return out;
}

async function section(label, fn) {
  const entry = { label, status: 'pass', result: null };
  try {
    const res = await fn();
    entry.result = res === undefined ? null : res;
  } catch (err) {
    entry.status = 'fail';
    entry.error = String(err.message ?? err);
    exitCode = exitCode || 2;
  }
  diagnostics.push(entry);
  if (!args.json) {
    if (entry.status === 'pass') console.log(`✓ ${label}`);
    else console.error(`✗ ${label}: ${entry.error}`);
  }
  return entry;
}

function extractHost(root) {
  // UNC path: \\\HOST\share\...
  if (!root) return null;
  if (root.startsWith('\\')) {
    const parts = root.replace(/^\\+/, '').split('\\');
    return parts[0] || null;
  }
  // try file:// or //host path
  try {
    const url = new URL(root);
    return url.hostname || null;
  } catch {
    return null;
  }
}

function failHard(msg) {
  diagnostics.push({ label: 'fatal', status: 'fail', error: msg });
  exitCode = exitCode || 2;
  finish();
}

function finish() {
  const summary = { passed: diagnostics.filter(d => d.status === 'pass').length, failed: diagnostics.filter(d => d.status === 'fail').length };
  if (args.json) {
    console.log(JSON.stringify({ summary, diagnostics }, null, 2));
  } else {
    console.log('\nSummary:');
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    if (summary.failed > 0) console.log('  (See JSON output with --json for full details)');
  }
  process.exit(exitCode);
}
