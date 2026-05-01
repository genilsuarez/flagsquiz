/**
 * Git Utilities - Shared git operations across all scripts
 */

import { execSync } from 'child_process';
import { logError, logInfo, logSuccess } from './logger.js';

const rootDir = process.cwd();

export function isGitRepository() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe', cwd: rootDir });
    return true;
  } catch {
    return false;
  }
}

export function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: rootDir });
    return status.trim().split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

export function hasStagedChanges() {
  try {
    execSync('git diff --cached --quiet', { cwd: rootDir });
    return false;
  } catch {
    return true;
  }
}

export function hasUnstagedChanges() {
  try {
    execSync('git diff --quiet', { cwd: rootDir });
    return false;
  } catch {
    return true;
  }
}

export function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8', cwd: rootDir }).trim();
  } catch {
    return 'unknown';
  }
}

export function getCurrentCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: rootDir }).trim();
  } catch {
    return 'unknown';
  }
}

export function getLatestCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: rootDir }).trim();
  } catch {
    return 'unknown';
  }
}

export function getRemoteUrl() {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf8', cwd: rootDir }).trim();
  } catch {
    return 'unknown';
  }
}

export function stageAllChanges() {
  try {
    execSync('git add .', { cwd: rootDir });
    logSuccess('All changes staged');
    return true;
  } catch {
    logError('Failed to stage changes');
    return false;
  }
}

export function pushToRemote() {
  try {
    logInfo('Pushing to remote...');
    execSync('git push', { stdio: 'inherit', cwd: rootDir });
    logSuccess('Changes pushed to remote');
    return true;
  } catch {
    logError('Failed to push to remote');
    return false;
  }
}

export function validateGitRepository() {
  if (!isGitRepository()) {
    logError('Not a git repository');
    return false;
  }
  return true;
}
