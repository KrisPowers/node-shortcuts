#!/usr/bin/env node
'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();

function getSnippetTargets() {
  if (process.platform === 'win32') {
    return [
      path.join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'snippets', 'javascript.json'),
      path.join(HOME, 'AppData', 'Roaming', 'Code - Insiders', 'User', 'snippets', 'javascript.json')
    ];
  }

  if (process.platform === 'darwin') {
    return [
      path.join(HOME, 'Library', 'Application Support', 'Code', 'User', 'snippets', 'javascript.json'),
      path.join(HOME, 'Library', 'Application Support', 'Code - Insiders', 'User', 'snippets', 'javascript.json')
    ];
  }

  return [
    path.join(HOME, '.config', 'Code', 'User', 'snippets', 'javascript.json'),
    path.join(HOME, '.config', 'Code - Insiders', 'User', 'snippets', 'javascript.json')
  ];
}

function readJSON(file) {
  if (!fs.existsSync(file)) return {};

  let raw = fs.readFileSync(file, 'utf8');
  raw = raw.replace(/\/\/.*$/gm, '');
  raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  raw = raw.replace(/,\s*([}\]])/g, '$1');

  return raw.trim() ? JSON.parse(raw) : {};
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const TARGETS = getSnippetTargets();

for (const target of TARGETS) {
  try {
    const snippets = readJSON(target);
    let removed = 0;

    for (const key of Object.keys(snippets)) {
      if (key.startsWith('Node.js ')) {
        delete snippets[key];
        removed++;
      }
    }

    if (removed > 0) {
      writeJSON(target, snippets);
      console.log(`🧹 Cleaned ${removed} snippets from: ${target}`);
    }
  } catch {
    console.warn(`⚠ Skipped invalid snippet file: ${target}`);
  }
}
