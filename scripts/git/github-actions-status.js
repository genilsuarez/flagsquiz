#!/usr/bin/env node

/**
 * GitHub Actions Status Checker
 * Usage: node scripts/git/github-actions-status.js [status|current|watch|watch-all|logs]
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  colors, log, logHeader, logSuccess, logError, logWarning, logInfo
} from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const REPO_OWNER = 'genilsuarez';
const REPO_NAME  = 'flagsquiz';

const command = process.argv[2] || 'status';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', cwd: rootDir }).trim();
}

function checkGHCLI() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getWorkflowRuns(limit = 10) {
  try {
    const out = run(
      `gh run list --limit ${limit} --json status,conclusion,workflowName,createdAt,headBranch,headSha,url,displayTitle,event,updatedAt`
    );
    return JSON.parse(out);
  } catch {
    logError('Failed to fetch workflow runs');
    return [];
  }
}

function printRuns(runs) {
  if (runs.length === 0) {
    logInfo('No workflow runs found');
    return;
  }
  runs.forEach(r => {
    const icon = r.conclusion === 'success' ? '✅' :
                 r.conclusion === 'failure' ? '❌' :
                 r.status === 'in_progress' ? '🔄' : '⏳';
    const sha = r.headSha?.substring(0, 8) || '?';
    log(`${icon} [${r.workflowName}] ${r.displayTitle} (${sha}) — ${r.status}/${r.conclusion || 'running'}`, colors.white);
  });
}

async function watchAll() {
  logHeader('👀 Watching GitHub Actions');
  logInfo('Polling every 10s — Ctrl+C to stop\n');

  const maxWait = 600; // 10 min
  let elapsed = 0;

  while (elapsed < maxWait) {
    const runs = getWorkflowRuns(5);
    const active = runs.filter(r => r.status === 'in_progress' || r.status === 'queued');

    console.clear();
    logHeader(`👀 GitHub Actions — ${new Date().toLocaleTimeString()}`);
    printRuns(runs.slice(0, 8));

    if (active.length === 0) {
      logSuccess('\nAll workflows completed');
      const failed = runs.filter(r => r.conclusion === 'failure');
      if (failed.length > 0) {
        logError(`${failed.length} workflow(s) failed`);
        process.exit(1);
      }
      process.exit(0);
    }

    await new Promise(r => setTimeout(r, 10000));
    elapsed += 10;
  }

  logWarning('Timeout waiting for workflows');
  process.exit(1);
}

async function main() {
  if (!checkGHCLI()) {
    logError('GitHub CLI not available or not authenticated');
    logInfo('Install: https://cli.github.com/');
    process.exit(1);
  }

  switch (command) {
    case 'status':
    case 'current': {
      logHeader('📊 GitHub Actions Status');
      const runs = getWorkflowRuns(10);
      printRuns(runs);
      break;
    }
    case 'watch':
    case 'watch-all':
      await watchAll();
      break;
    case 'logs': {
      try {
        execSync('gh run list --limit 5', { stdio: 'inherit', cwd: rootDir });
      } catch {
        logError('Failed to fetch logs');
      }
      break;
    }
    default:
      logWarning(`Unknown command: ${command}`);
      logInfo('Usage: node scripts/git/github-actions-status.js [status|current|watch|watch-all|logs]');
  }
}

main().catch(err => {
  logError(err.message);
  process.exit(1);
});
