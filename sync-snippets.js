#!/usr/bin/env node
'use strict';

import fs from 'fs';
import path from 'path';

const SOURCE_FILE = path.resolve('./snippets/node.json');
const VSC_FILE = path.resolve('./node.code-snippets');

/**
 * Safely read JSON file
 */
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.trim() ? JSON.parse(raw) : {};
}

/**
 * Write formatted JSON
 */
function writeJSON(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + '\n',
    'utf8'
  );
}

/**
 * Sync snippets
 */
function syncSnippets() {
  const sourceSnippets = readJSON(SOURCE_FILE);
  const vscSnippets = readJSON(VSC_FILE);

  let added = 0;
  let updated = 0;

  for (const [name, snippet] of Object.entries(sourceSnippets)) {
    if (!vscSnippets[name]) {
      added++;
    } else if (JSON.stringify(vscSnippets[name]) !== JSON.stringify(snippet)) {
      updated++;
    }

    vscSnippets[name] = snippet;
  }

  writeJSON(VSC_FILE, vscSnippets);

  console.log(`✔ Snippets synced`);
  console.log(`➕ Added: ${added}`);
  console.log(`🔄 Updated: ${updated}`);
}

/**
 * Run
 */
try {
  syncSnippets();
} catch (err) {
  console.error('❌ Failed to sync snippets');
  console.error(err);
  process.exit(1);
}
