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

// Enhanced troubleshooting system
class NASTroubleshooter {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.tests = [];
  }

  async runSection(label, fn) {
    const entry = { label, status: 'pass', result: null };
    try {
      const res = await fn();
      entry.result = res === undefined ? null : res;
    } catch (err) {
      entry.status = 'fail';
      entry.error = String(err.message ?? err);
    }
    this.tests.push(entry);
    if (!args.json) {
      if (entry.status === 'pass') console.log(`✓ ${label}`);
      else console.error(`✗ ${label}: ${entry.error}`);
    }
    return entry;
  }

  async runFullDiagnostics() {
    console.log('🔍 Running comprehensive NAS connectivity diagnostics...\n');

    // Environment & Configuration
    await this.checkEnvironment();
    await this.checkConfiguration();
    await this.checkPaths();

    // Network & Connectivity
    await this.checkNetworkConnectivity();
    await this.checkCredentials();
    await this.checkPermissions();

    // Database & Services
    await this.checkDatabaseAccess();
    await this.checkBuildInfo();

    // Generate Report
    this.generateReport();

    return {
      issues: this.issues,
      fixes: this.fixes,
      tests: this.tests
    };
  }

  async checkEnvironment() {
    const entry = await this.runSection('Environment Check', async () => {
      const env = {
        platform: process.platform,
        nodeVersion: process.version,
        username: os.userInfo().username,
        hostname: os.hostname(),
        envVars: {}
      };

      ENV_KEYS.forEach(key => {
        if (process.env[key]) {
          env.envVars[key] = process.env[key];
        }
      });

      // Check for common issues
      if (!env.envVars.CTH_RUNTIME_ROOT && !env.envVars.CRAFT_TOOLS_RUNTIME_ROOT) {
        this.issues.push({
          type: 'configuration',
          severity: 'high',
          title: 'No runtime root configured',
          description: 'No CTH_RUNTIME_ROOT or CRAFT_TOOLS_RUNTIME_ROOT environment variable set',
          fix: 'Set CTH_RUNTIME_ROOT environment variable to NAS path (e.g., \\\\server\\share\\CraftAuto-Sales\\CACPQDB)'
        });
      }

      return env;
    });
    return entry.result;
  }

  async checkConfiguration() {
    const entry = await this.runSection('Configuration Validation', async () => {
      const config = {
        resolvedRoot,
        usingOverride: Boolean(resolvedRoot),
        configFile: null
      };

      // Check for packaged config
      try {
        const configPath = path.join(process.cwd(), 'config', 'runtime.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        config.configFile = JSON.parse(configData);
      } catch (e) {
        // No packaged config
      }

      if (!resolvedRoot && !config.configFile) {
        this.issues.push({
          type: 'configuration',
          severity: 'high',
          title: 'No configuration found',
          description: 'Neither environment variables nor packaged config found',
          fix: 'Configure runtime path via environment variable or config file'
        });
      }

      return config;
    });
    return entry.result;
  }

  async checkPaths() {
    const entry = await this.runSection('Path Resolution', async () => {
      const paths = {
        resolvedRoot,
        expectedStructure: ['database', 'OUTPUT', 'Settings'],
        accessiblePaths: [],
        inaccessiblePaths: []
      };

      if (!resolvedRoot) {
        this.issues.push({
          type: 'path',
          severity: 'high',
          title: 'Cannot resolve runtime root',
          description: 'Unable to determine NAS path',
          fix: 'Check environment variables and configuration'
        });
        return paths;
      }

      // Test root access
      try {
        await fs.access(resolvedRoot);
        paths.accessiblePaths.push(resolvedRoot);
      } catch (e) {
        paths.inaccessiblePaths.push({ path: resolvedRoot, error: e.message });
        this.issues.push({
          type: 'path',
          severity: 'critical',
          title: 'NAS root inaccessible',
          description: `Cannot access ${resolvedRoot}: ${e.message}`,
          fix: 'Check network connectivity, credentials, and share permissions'
        });
        return paths;
      }

      // Check expected directories
      for (const dir of paths.expectedStructure) {
        const dirPath = path.join(resolvedRoot, dir);
        try {
          await fs.access(dirPath);
          paths.accessiblePaths.push(dirPath);
        } catch (e) {
          paths.inaccessiblePaths.push({ path: dirPath, error: e.message });
          this.issues.push({
            type: 'path',
            severity: 'medium',
            title: `Missing directory: ${dir}`,
            description: `Directory ${dir} not found or inaccessible`,
            fix: `Ensure ${dir} directory exists on NAS share`
          });
        }
      }

      return paths;
    });
    return entry.result;
  }

  async checkNetworkConnectivity() {
    const entry = await this.runSection('Network Connectivity', async () => {
      const network = {
        host: null,
        pingable: false,
        ports: {},
        latency: null
      };

      if (!resolvedRoot) return network;

      // Extract host from UNC path
      const hostMatch = resolvedRoot.match(/^\\\\([^\\]+)/);
      if (hostMatch) {
        network.host = hostMatch[1];

        if (process.platform === 'win32') {
          // Test ping
          try {
            const pingResult = execSync(`ping -n 1 ${network.host}`, { stdio: 'pipe', timeout: 5000 });
            network.pingable = !pingResult.toString().includes('unreachable');
            if (network.pingable) {
              // Extract latency
              const latencyMatch = pingResult.toString().match(/time[=<](\d+)ms/);
              if (latencyMatch) {
                network.latency = parseInt(latencyMatch[1]);
              }
            }
          } catch (e) {
            network.pingable = false;
            this.issues.push({
              type: 'network',
              severity: 'high',
              title: 'Host unreachable',
              description: `Cannot ping ${network.host}`,
              fix: 'Check network connectivity and firewall settings'
            });
          }

          // Test common ports
          const ports = [139, 445]; // SMB ports
          for (const port of ports) {
            try {
              execSync(`powershell Test-NetConnection -ComputerName ${network.host} -Port ${port} -InformationLevel Quiet`, { stdio: 'pipe', timeout: 5000 });
              network.ports[port] = 'open';
            } catch (e) {
              network.ports[port] = 'closed';
              if (port === 445) {
                this.issues.push({
                  type: 'network',
                  severity: 'high',
                  title: 'SMB port blocked',
                  description: `Port ${port} is not accessible on ${network.host}`,
                  fix: 'Check firewall settings and ensure SMB service is running'
                });
              }
            }
          }
        }
      }

      return network;
    });
    return entry.result;
  }

  async checkCredentials() {
    const entry = await this.runSection('Credential Validation', async () => {
      const creds = {
        storedCredentials: false,
        credentialTest: null
      };

      if (process.platform === 'win32') {
        try {
          const output = execSync('cmdkey /list', { encoding: 'utf8' });
          creds.storedCredentials = output.includes('CraftAuto-Sales');

          if (!creds.storedCredentials) {
            this.issues.push({
              type: 'credentials',
              severity: 'medium',
              title: 'No stored credentials',
              description: 'No network credentials stored for CraftAuto-Sales share',
              fix: 'Store network credentials using: net use \\\\server\\share /user:username password'
            });
          }

          // Test active connections
          const netUse = execSync('net use', { encoding: 'utf8' });
          creds.activeConnections = netUse.includes('CraftAuto-Sales');

          if (!creds.activeConnections) {
            this.issues.push({
              type: 'credentials',
              severity: 'high',
              title: 'No active connection',
              description: 'No active network connection to CraftAuto-Sales share',
              fix: 'Connect to share using: net use Z: \\\\server\\share /persistent:yes'
            });
          }

        } catch (e) {
          this.issues.push({
            type: 'credentials',
            severity: 'medium',
            title: 'Credential check failed',
            description: `Could not verify stored credentials: ${e.message}`,
            fix: 'Run diagnostics as administrator or check credential storage'
          });
        }
      }

      return creds;
    });
    return entry.result;
  }

  async checkPermissions() {
    const entry = await this.runSection('Permission Check', async () => {
      const perms = {
        readAccess: false,
        writeAccess: false,
        testFile: null
      };

      if (!resolvedRoot) return perms;

      try {
        // Test read access
        const entries = await fs.readdir(resolvedRoot);
        perms.readAccess = true;

        // Test write access
        const testDir = path.join(resolvedRoot, '.cth_diag');
        await fs.mkdir(testDir, { recursive: true });

        const testFile = path.join(testDir, `perm-test-${Date.now()}.tmp`);
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);

        perms.writeAccess = true;
        perms.testFile = testDir;

      } catch (e) {
        if (e.code === 'EACCES') {
          this.issues.push({
            type: 'permissions',
            severity: 'high',
            title: 'Insufficient permissions',
            description: `No ${perms.readAccess ? 'write' : 'read'} access to NAS share`,
            fix: 'Check share permissions and ensure user has read/write access'
          });
        } else {
          this.issues.push({
            type: 'permissions',
            severity: 'medium',
            title: 'Permission test failed',
            description: `Could not verify permissions: ${e.message}`,
            fix: 'Check network share configuration and user permissions'
          });
        }
      }

      return perms;
    });
    return entry.result;
  }

  async checkDatabaseAccess() {
    const entry = await this.runSection('Database Access', async () => {
      const db = {
        databases: ['server.db', 'generated_numbers.db'],
        accessible: [],
        inaccessible: [],
        sizes: {}
      };

      if (!resolvedRoot) return db;

      for (const dbName of db.databases) {
        const dbPath = path.join(resolvedRoot, 'database', dbName);
        try {
          const stat = await fs.stat(dbPath);
          db.accessible.push(dbName);
          db.sizes[dbName] = stat.size;
        } catch (e) {
          db.inaccessible.push({ name: dbName, error: e.message });
          this.issues.push({
            type: 'database',
            severity: 'high',
            title: `Database missing: ${dbName}`,
            description: `Could not access ${dbName}: ${e.message}`,
            fix: 'Ensure database files exist on NAS and are accessible'
          });
        }
      }

      return db;
    });
    return entry.result;
  }

  async checkBuildInfo() {
    const entry = await this.runSection('Build Info Validation', async () => {
      const build = {
        buildInfoPath: null,
        buildInfo: null,
        valid: false,
        age: null
      };

      if (!resolvedRoot) return build;

      const buildInfoPath = path.join(resolvedRoot, 'build-info.json');
      build.buildInfoPath = buildInfoPath;

      try {
        const content = await fs.readFile(buildInfoPath, 'utf-8');
        const info = JSON.parse(content);
        build.buildInfo = info;
        build.valid = true;

        if (info.timestampUtc) {
          const age = Date.now() - new Date(info.timestampUtc).getTime();
          build.age = Math.round(age / (1000 * 60 * 60 * 24)); // days
        }

        if (build.age > 30) {
          this.issues.push({
            type: 'build',
            severity: 'low',
            title: 'Outdated build info',
            description: `Build info is ${build.age} days old`,
            fix: 'Update build-info.json with current deployment information'
          });
        }

      } catch (e) {
        build.valid = false;
        this.issues.push({
          type: 'build',
          severity: 'medium',
          title: 'Invalid build info',
          description: `Could not read build-info.json: ${e.message}`,
          fix: 'Ensure build-info.json exists and contains valid JSON'
        });
      }

      return build;
    });
    return entry.result;
  }

  generateReport() {
    console.log('\n📋 DIAGNOSTIC REPORT');
    console.log('='.repeat(50));

    if (this.issues.length === 0) {
      console.log('✅ No issues found! NAS connectivity appears healthy.');
      return;
    }

    // Group issues by severity
    const bySeverity = {
      critical: this.issues.filter(i => i.severity === 'critical'),
      high: this.issues.filter(i => i.severity === 'high'),
      medium: this.issues.filter(i => i.severity === 'medium'),
      low: this.issues.filter(i => i.severity === 'low')
    };

    for (const [severity, issues] of Object.entries(bySeverity)) {
      if (issues.length > 0) {
        const icon = { critical: '🚨', high: '⚠️', medium: 'ℹ️', low: '💡' }[severity];
        console.log(`\n${icon} ${severity.toUpperCase()} PRIORITY ISSUES (${issues.length}):`);

        issues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue.title}`);
          console.log(`     ${issue.description}`);
          console.log(`     🔧 Fix: ${issue.fix}`);
        });
      }
    }

    console.log('\n💡 RECOMMENDED NEXT STEPS:');
    console.log('1. Address critical and high priority issues first');
    console.log('2. Test connectivity after applying fixes');
    console.log('3. Run diagnostics again to verify resolution');
    console.log('4. Contact IT support if issues persist');
  }
}

async function main() {
  const troubleshooter = new NASTroubleshooter();
  const results = await troubleshooter.runFullDiagnostics();

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  }

  // Set exit code based on issues
  const criticalIssues = results.issues.filter(i => i.severity === 'critical').length;
  const highIssues = results.issues.filter(i => i.severity === 'high').length;

  if (criticalIssues > 0) exitCode = 3;
  else if (highIssues > 0) exitCode = 2;
  else if (results.issues.length > 0) exitCode = 1;

  process.exit(exitCode);
}

main().catch(err => {
  diagnostics.push({ label: 'fatal', status: 'fail', error: String(err) });
  exitCode = exitCode || 2;
  if (args.json) {
    console.log(JSON.stringify({ error: String(err) }, null, 2));
  } else {
    console.error('Fatal error:', err);
  }
  process.exit(exitCode);
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
  if (!root) return null;
  if (root.startsWith('\\')) {
    const parts = root.replace(/^\\+/, '').split('\\');
    return parts[0] || null;
  }
  try {
    const url = new URL(root);
    return url.hostname || null;
  } catch {
    return null;
  }
}