#!/usr/bin/env node

/**
 * Development Tools - Unified workflow orchestrator
 * Usage: node scripts/development/dev-tools.js [full|build|quality] [--quiet]
 */

import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  colors, log, logHeader, logSuccess, logError, logWarning, logInfo
} from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(dirname(__dirname));

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('--')) || 'full';
const quiet = args.includes('--quiet');

// ─── Helpers ────────────────────────────────────────────────────────────────

function executeCommand(cmd, desc) {
  const start = Date.now();
  try {
    log(`🔄 ${desc}...`, colors.cyan);
    if (quiet) {
      const out = execSync(cmd, {
        stdio: 'pipe', cwd: rootDir,
        env: { ...process.env, FORCE_COLOR: '0' },
        encoding: 'utf8', maxBuffer: 10 * 1024 * 1024
      });
      // In quiet mode only surface real errors
      if (out) {
        const errors = out.split('\n').filter(l => /\b(error|fail(ed|ure)?|fatal)\b/i.test(l.trim()));
        errors.slice(0, 5).forEach(l => logWarning(l.trim()));
      }
    } else {
      execSync(cmd, { stdio: 'inherit', cwd: rootDir, env: { ...process.env, FORCE_COLOR: '1' } });
    }
    logSuccess(`${desc} — ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return true;
  } catch (err) {
    logError(`${desc} failed — ${((Date.now() - start) / 1000).toFixed(1)}s`);
    if (quiet && err.stdout) console.log(err.stdout);
    if (quiet && err.stderr) console.error(err.stderr);
    return false;
  }
}

function executeParallel(commands) {
  const start = Date.now();
  log(`⚡ Parallel: ${commands.map(c => c.desc).join(', ')}`, colors.cyan);

  const promises = commands.map(({ cmd, desc }) => {
    const taskStart = Date.now();
    return new Promise(resolve => {
      const child = spawn('sh', ['-c', cmd], {
        cwd: rootDir, env: { ...process.env, FORCE_COLOR: '0' }, stdio: 'pipe'
      });
      let stdout = '', stderr = '';
      child.stdout.on('data', d => { stdout += d; });
      child.stderr.on('data', d => { stderr += d; });
      child.on('close', code => {
        const dur = ((Date.now() - taskStart) / 1000).toFixed(1);
        if (code === 0) {
          logSuccess(`${desc} — ${dur}s`);
          resolve({ success: true, desc });
        } else {
          logError(`${desc} failed — ${dur}s`);
          if (stdout.trim()) console.log(stdout);
          if (stderr.trim()) console.error(stderr);
          resolve({ success: false, desc });
        }
      });
    });
  });

  return Promise.all(promises).then(results => {
    const ok = results.every(r => r.success);
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    if (ok) logSuccess(`Parallel group — ${dur}s`);
    else logError(`Parallel group failed — ${dur}s (${results.filter(r => !r.success).map(r => r.desc).join(', ')})`);
    return ok;
  });
}

// ─── Pipelines ──────────────────────────────────────────────────────────────

const pipelines = {
  build: {
    name: '🏗️  Build',
    description: 'Build application for production',
    steps: [
      { type: 'command', cmd: 'npm run build', desc: 'Vite build' },
    ]
  },
  full: {
    name: '🚀 Full Pipeline',
    description: 'Commit → Build → Push → Deploy',
    steps: [
      { type: 'command', cmd: 'node scripts/git/smart-commit.js --stage-all --auto --allow-empty', desc: 'Pre-build commit' },
      { type: 'command', cmd: 'git pull --rebase', desc: 'Sync with remote' },
      { type: 'command', cmd: 'npm run build', desc: 'Build application' },
      { type: 'command', cmd: 'node scripts/git/smart-commit.js --stage-all --push --auto --allow-empty', desc: 'Post-build commit & push' },
      { type: 'command', cmd: 'node scripts/git/github-actions-status.js watch-all', desc: 'Monitor CI/CD pipeline' },
    ]
  }
};

// ─── Runner ─────────────────────────────────────────────────────────────────

async function runPipeline(name) {
  const pipeline = pipelines[name];
  if (!pipeline) {
    logError(`Unknown pipeline: ${name}`);
    logInfo(`Available: ${Object.keys(pipelines).join(', ')}`);
    process.exit(1);
  }

  logHeader(pipeline.name);
  logInfo(pipeline.description);

  const start = Date.now();
  let allOk = true;

  for (const step of pipeline.steps) {
    if (step.type === 'command') {
      const ok = executeCommand(step.cmd, step.desc);
      if (!ok) { allOk = false; break; }
    } else if (step.type === 'parallel') {
      const ok = await executeParallel(step.cmds);
      if (!ok) { allOk = false; break; }
    }
  }

  const total = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  if (allOk) {
    logSuccess(`Pipeline "${pipeline.name}" completed in ${total}s`);
  } else {
    logError(`Pipeline "${pipeline.name}" failed after ${total}s`);
    process.exit(1);
  }
}

runPipeline(command).catch(err => {
  logError(err.message);
  process.exit(1);
});
