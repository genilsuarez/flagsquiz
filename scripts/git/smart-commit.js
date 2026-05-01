#!/usr/bin/env node

/**
 * Smart Commit - Auto-generates commit messages based on git diff
 * Usage: node scripts/git/smart-commit.js [options]
 *   --stage-all   Stage all changes before committing
 *   --push        Push after committing
 *   --auto        Skip confirmation prompt
 *   --allow-empty Allow commit even with no changes
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  colors, log, logHeader, logSuccess, logError, logWarning, logInfo
} from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(dirname(__dirname));

const args = process.argv.slice(2);
const opts = {
  stageAll:   args.includes('--stage-all'),
  push:       args.includes('--push'),
  auto:       args.includes('--auto'),
  allowEmpty: args.includes('--allow-empty'),
};

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', cwd: rootDir, ...opts }).trim();
}

function getStatus() {
  return run('git status --porcelain').split('\n').filter(Boolean);
}

function getStagedFiles() {
  return run('git diff --cached --name-status').split('\n').filter(Boolean);
}

function generateMessage(statusLines, stagedFiles) {
  const counts = { A: 0, M: 0, D: 0, R: 0 };
  const files = [];

  stagedFiles.forEach(line => {
    const [type, file] = line.split('\t');
    counts[type[0]] = (counts[type[0]] || 0) + 1;
    files.push(file);
  });

  // Determine scope from file paths
  const scopes = new Set();
  files.forEach(f => {
    if (f.startsWith('src/controllers')) scopes.add('controllers');
    else if (f.startsWith('src/models'))     scopes.add('models');
    else if (f.startsWith('src/views'))      scopes.add('views');
    else if (f.startsWith('src/services'))   scopes.add('services');
    else if (f.startsWith('src/utils'))      scopes.add('utils');
    else if (f.startsWith('assets/'))        scopes.add('assets');
    else if (f.startsWith('scripts/'))       scopes.add('scripts');
    else if (f.startsWith('.github/'))       scopes.add('ci');
    else if (f === 'package.json' || f === 'vite.config.js') scopes.add('config');
  });

  const scope = scopes.size > 0 ? `(${[...scopes].slice(0, 2).join(',')})` : '';

  const parts = [];
  if (counts.A) parts.push(`add ${counts.A} file${counts.A > 1 ? 's' : ''}`);
  if (counts.M) parts.push(`update ${counts.M} file${counts.M > 1 ? 's' : ''}`);
  if (counts.D) parts.push(`remove ${counts.D} file${counts.D > 1 ? 's' : ''}`);
  if (counts.R) parts.push(`rename ${counts.R} file${counts.R > 1 ? 's' : ''}`);

  const type = counts.A > counts.M ? 'feat' : 'chore';
  const summary = parts.join(', ') || 'update project';

  return `${type}${scope}: ${summary}`;
}

async function main() {
  logHeader('📝 Smart Commit');

  if (opts.stageAll) {
    log('Staging all changes...', colors.cyan);
    execSync('git add .', { cwd: rootDir, stdio: 'inherit' });
  }

  const staged = getStagedFiles();

  if (staged.length === 0) {
    if (opts.allowEmpty) {
      logInfo('No staged changes — skipping commit');
      process.exit(0);
    }
    logWarning('No staged changes to commit');
    process.exit(0);
  }

  const message = generateMessage(getStatus(), staged);
  logInfo(`Generated message: "${message}"`);
  logInfo(`Files: ${staged.length} staged`);

  try {
    execSync(`git commit -m "${message}"`, { stdio: 'inherit', cwd: rootDir });
    logSuccess('Committed successfully');
  } catch (err) {
    if (opts.allowEmpty) {
      logInfo('Nothing to commit — continuing');
      process.exit(0);
    }
    logError('Commit failed');
    process.exit(1);
  }

  if (opts.push) {
    log('Pushing to remote...', colors.cyan);
    try {
      execSync('git push', { stdio: 'inherit', cwd: rootDir });
      logSuccess('Pushed to remote');
    } catch {
      logError('Push failed');
      process.exit(1);
    }
  }
}

main().catch(err => {
  logError(err.message);
  process.exit(1);
});
