#!/usr/bin/env node
'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';

// -----------------------------
// Source file (canonical snippets)
// -----------------------------
const SOURCE_FILE = path.resolve('./snippets/node.json');

// -----------------------------
// Cross-platform VS Code + Insiders targets
// -----------------------------
function getVSCodeTargets() {
  const home = os.homedir();
  const files = ['javascript.json', 'typescript.json']; // Auto JS + TS

  const bases = (() => {
    switch (process.platform) {
      case 'win32':
        return [
          path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'snippets'),
          path.join(home, 'AppData', 'Roaming', 'Code - Insiders', 'User', 'snippets')
        ];
      case 'darwin':
        return [
          path.join(home, 'Library', 'Application Support', 'Code', 'User', 'snippets'),
          path.join(home, 'Library', 'Application Support', 'Code - Insiders', 'User', 'snippets')
        ];
      default: // linux
        return [
          path.join(home, '.config', 'Code', 'User', 'snippets'),
          path.join(home, '.config', 'Code - Insiders', 'User', 'snippets')
        ];
    }
  })();

  // Return all combinations: each base × each file
  return bases.flatMap(base => files.map(file => path.join(base, file)));
}

// -----------------------------
// JSONC-safe read
// -----------------------------
function readJSON(file) {
  if (!fs.existsSync(file)) return {};

  let raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) return {};

  // Strip comments
  raw = raw.replace(/\/\/.*$/gm, '');
  raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  // Strip trailing commas
  raw = raw.replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(raw);
}

// -----------------------------
// Ensure directory exists
// -----------------------------
function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

// -----------------------------
// Write JSON safely
// -----------------------------
function writeJSON(file, data) {
  ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// -----------------------------
// Sync snippets
// -----------------------------
function sync(target) {
  const sourceSnippets = readJSON(SOURCE_FILE);
  const userSnippets = readJSON(target);

  let added = 0;
  let updated = 0;

  for (const [key, snippet] of Object.entries(sourceSnippets)) {
    if (!userSnippets[key]) added++;
    else if (JSON.stringify(userSnippets[key]) !== JSON.stringify(snippet)) updated++;

    userSnippets[key] = snippet;
  }

  writeJSON(target, userSnippets);

  console.log(`✔ Synced: ${target}`);
  console.log(`  ➕ Added: ${added}`);
  console.log(`  🔄 Updated: ${updated}`);
}

// -----------------------------
// Run sync for all targets
// -----------------------------
try {
  const TARGETS = getVSCodeTargets();
  for (const target of TARGETS) {
    try {
      sync(target);
    } catch (err) {
      console.warn(`⚠ Skipped invalid snippet file: ${target}`);
    }
  }
} catch (err) {
  console.error('❌ Snippet sync failed');
  console.error(err);
  process.exit(1);
}
