#!/usr/bin/env node
'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';

// -----------------------------
// Remote source file (canonical snippets)
// -----------------------------
const SOURCE_URL = 'https://node-snippets.krispowers.dev/vsc.json';

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

  return bases.flatMap(base => files.map(file => path.join(base, file)));
}

// -----------------------------
// JSONC-safe read
// -----------------------------
function readJSON(file) {
  if (!fs.existsSync(file)) return {};

  let raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) return {};

  raw = raw.replace(/\/\/.*$/gm, '');
  raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
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
// Fetch remote JSON source
// -----------------------------
async function fetchRemoteSnippets() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch snippets: ${res.status}`);
  return await res.json();
}

// -----------------------------
// Sync snippets
// -----------------------------
function mergeSnippets(userSnippets, sourceSnippets) {
  let added = 0;
  let updated = 0;

  for (const [key, snippet] of Object.entries(sourceSnippets)) {
    if (!userSnippets[key]) added++;
    else if (JSON.stringify(userSnippets[key]) !== JSON.stringify(snippet)) updated++;
    userSnippets[key] = snippet;
  }

  return { merged: userSnippets, added, updated };
}

async function sync(target) {
  const sourceSnippets = await fetchRemoteSnippets();
  const userSnippets = readJSON(target);

  const { merged, added, updated } = mergeSnippets(userSnippets, sourceSnippets);

  writeJSON(target, merged);

  console.log(`✔ Synced: ${target}`);
  console.log(`  ➕ Added: ${added}`);
  console.log(`  🔄 Updated: ${updated}`);
}

// -----------------------------
// Run sync for all targets
// -----------------------------
(async () => {
  try {
    const TARGETS = getVSCodeTargets();
    for (const target of TARGETS) {
      try {
        await sync(target);
      } catch (err) {
        console.warn(`⚠ Skipped invalid snippet file: ${target}`);
        console.error(err.message);
      }
    }
  } catch (err) {
    console.error('❌ Snippet sync failed');
    console.error(err);
    process.exit(1);
  }
})();
