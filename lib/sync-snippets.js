#!/usr/bin/env node
'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

// -----------------------------
// REMOTE SOURCE (RESTORED)
// -----------------------------
const SOURCE_URL =
  'https://node-snippets.krispowers.dev/vsc.json';

// -----------------------------
// FETCH + PARSE
// -----------------------------
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch snippets (${res.statusCode})`));
          return;
        }

        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          try {
            data = data
              .replace(/\/\/.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/,\s*([}\]])/g, '$1');

            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

// -----------------------------
// IDE DETECTION (BEST-EFFORT)
// -----------------------------
function detectIDEs() {
  const env = process.env;
  const home = os.homedir();

  const detected = new Set();

  // ---- ENV-BASED ----
  if (env.TERM_PROGRAM === 'vscode' || env.VSCODE_CWD) {
    detected.add('vsc');
  }

  if (env.TERM_PROGRAM === 'vscode-insiders') {
    detected.add('vsci');
  }

  if (env.ATOM_HOME) {
    detected.add('atom');
  }

  // ---- FILESYSTEM-BASED ----
  const paths = {
    vsc: [
      path.join(home, 'AppData', 'Roaming', 'Code'),
      path.join(home, '.config', 'Code'),
      path.join(home, 'Library', 'Application Support', 'Code')
    ],
    vsci: [
      path.join(home, 'AppData', 'Roaming', 'Code - Insiders'),
      path.join(home, '.config', 'Code - Insiders'),
      path.join(home, 'Library', 'Application Support', 'Code - Insiders')
    ],
    atom: [
      path.join(home, '.atom')
    ]
  };

  for (const [ide, roots] of Object.entries(paths)) {
    for (const r of roots) {
      if (fs.existsSync(r)) {
        detected.add(ide);
        break;
      }
    }
  }

  return detected.size ? Array.from(detected) : ['all'];
}


// -----------------------------
// FILE HELPERS
// -----------------------------
function readJSON(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function escapeAtom(body) {
  return body.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// -----------------------------
// VS CODE TARGETS
// -----------------------------
function getVSCodeTargets() {
  const home = os.homedir();

  const roots =
    process.platform === 'win32'
      ? [
          path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'snippets'),
          path.join(home, 'AppData', 'Roaming', 'Code - Insiders', 'User', 'snippets')
        ]
      : process.platform === 'darwin'
      ? [
          path.join(home, 'Library', 'Application Support', 'Code', 'User', 'snippets'),
          path.join(home, 'Library', 'Application Support', 'Code - Insiders', 'User', 'snippets')
        ]
      : [
          path.join(home, '.config', 'Code', 'User', 'snippets'),
          path.join(home, '.config', 'Code - Insiders', 'User', 'snippets')
        ];

  return roots.flatMap(r => [
    path.join(r, 'javascript.json'),
    path.join(r, 'typescript.json')
  ]);
}

// -----------------------------
// VS CODE INSTALL / CLEANUP
// -----------------------------
function installVSCode(source) {
  for (const target of getVSCodeTargets()) {
    const existing = readJSON(target);
    Object.assign(existing, source);
    writeJSON(target, existing);
    console.log(`✔ VS Code → ${target}`);
  }
}

function uninstallVSCode(source) {
  for (const target of getVSCodeTargets()) {
    if (!fs.existsSync(target)) continue;

    const existing = readJSON(target);
    let changed = false;

    for (const key of Object.keys(source)) {
      if (key in existing) {
        delete existing[key];
        changed = true;
      }
    }

    if (changed) {
      writeJSON(target, existing);
      console.log(`✔ VS Code cleaned → ${target}`);
    }
  }
}

// -----------------------------
// ATOM INSTALL / CLEANUP
// -----------------------------
const ATOM_FILE = path.join(os.homedir(), '.atom', 'snippets.cson');
const ATOM_SCOPES = ['.source.js', '.source.ts'];

function installAtom(source) {
  fs.mkdirSync(path.dirname(ATOM_FILE), { recursive: true });
  let content = fs.existsSync(ATOM_FILE)
    ? fs.readFileSync(ATOM_FILE, 'utf8')
    : '';

  let out = '';

  for (const scope of ATOM_SCOPES) {
    if (!content.includes(`${scope}:`)) {
      out += `\n${scope}:\n`;
    }

    for (const [name, s] of Object.entries(source)) {
      if (new RegExp(`['"]${name}['"]:\\s*$`, 'm').test(content)) continue;

      const prefix = Array.isArray(s.prefix) ? s.prefix[0] : s.prefix;
      const body = Array.isArray(s.body) ? s.body.join('\n') : s.body;

      out +=
`  '${name}':
    'prefix': '${prefix}'
    'body': '${escapeAtom(body)}'
`;
    }
  }

  if (out.trim()) {
    fs.appendFileSync(ATOM_FILE, out);
    console.log(`✔ Atom → ${ATOM_FILE}`);
  }
}

function uninstallAtom(source) {
  if (!fs.existsSync(ATOM_FILE)) return;

  let content = fs.readFileSync(ATOM_FILE, 'utf8');
  let original = content;

  for (const key of Object.keys(source)) {
    content = content.replace(
      new RegExp(`\\s*['"]${key}['"]:\\n(?:\\s+.*\\n)+`, 'g'),
      ''
    );
  }

  if (content !== original) {
    fs.writeFileSync(ATOM_FILE, content);
    console.log(`✔ Atom cleaned → ${ATOM_FILE}`);
  }
}

// -----------------------------
// RUN
// -----------------------------
const isUninstall =
  process.env.npm_lifecycle_event === 'preuninstall';

(async () => {
  const source = await fetchJSON(SOURCE_URL);

  if (!Object.keys(source).length) {
    console.warn('⚠ No snippets found');
    return;
  }

  const ides = detectIDEs();
  const fallbackAll = ides.includes('all');

  console.log(`ℹ Detected IDEs: ${fallbackAll ? 'all (fallback)' : ides.join(', ')}`);

  if (isUninstall) {
    if (fallbackAll || ides.includes('vsc') || ides.includes('vsci')) {
      uninstallVSCode(source);
      console.log('🧹 VS Code snippets removed');
    }
    if (fallbackAll || ides.includes('atom')) {
      uninstallAtom(source);
      console.log('🧹 Atom snippets removed');
    }
  } else {
    if (fallbackAll || ides.includes('vsc') || ides.includes('vsci')) {
      installVSCode(source);
      console.log('📦 VS Code snippets installed');
    }
    if (fallbackAll || ides.includes('atom')) {
      installAtom(source);
      console.log('📦 Atom snippets installed');
    }
  }

  console.log('✔ Snippet sync complete');
})().catch(err => {
  console.error('❌ Snippet sync failed');
  console.error(err);
  process.exit(1);
});
