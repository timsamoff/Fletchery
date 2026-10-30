// Claude Code SessionStart hook: surfaces the handoff and, once a week, a newer Sentinel version.
// Prints nothing and exits 0 whenever there's nothing to say or anything fails.
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HANDOFF = path.join(ROOT, 'Sentinel-Notes', 'HANDOFF.md');
const LAST_CHECK = path.join(ROOT, 'Sentinel-Notes', '.sentinel-version-check');
const INIT = path.join(ROOT, 'Sentinel-Prompts', 'sentinel-init.md');
const PROFILE = path.join(ROOT, 'PROJECT_PROFILE.md');
const REMOTE = 'https://raw.githubusercontent.com/timsamoff/Sentinel/main/Sentinel-Prompts/sentinel-init.md';
const WEEK_MS = 7 * 86400000;
const VERSION_RE = /^\*\*Version (\d+)\.(\d+)(?:\.(\d+))?\*\*$/m;

function handoff() {
  try {
    const text = fs.readFileSync(HANDOFF, 'utf8').trim();
    if (!text) return;
    console.log(
      'A handoff from a previous session follows. In your first reply, whatever the user asks, start with one line saying a handoff exists and what it covers, then answer their question. If version control shows uncommitted changes the handoff doesn\'t mention, say in that same line that it may be out of date.\n',
    );
    console.log(text);
    console.log('');
  } catch {}
}

const parse = (text) => {
  const m = text.match(VERSION_RE);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
};
const newer = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// Plain https with no keep-alive: fetch plus an early exit crashes Node on Windows.
function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { agent: false, timeout: 4000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}

async function versionCheck() {
  try {
    const last = fs.existsSync(LAST_CHECK) ? Number(fs.readFileSync(LAST_CHECK, 'utf8')) : 0;
    if (Date.now() - last < WEEK_MS) return;
    fs.writeFileSync(LAST_CHECK, String(Date.now()));
    const installed = parse(fs.readFileSync(INIT, 'utf8').split('\n').slice(0, 5).join('\n'));
    if (!installed) return;
    const body = await get(REMOTE);
    if (!body) return;
    const latest = parse(body.split('\n').slice(0, 5).join('\n'));
    if (!latest || newer(latest, installed) <= 0) return;
    const latestStr = latest.join('.');
    const profile = fs.existsSync(PROFILE) ? fs.readFileSync(PROFILE, 'utf8') : '';
    if (profile.includes(`Skipped update: ${latestStr}`)) return;
    console.log(
      `A newer version of Sentinel is available (${latestStr}; installed: ${installed.join('.')}). In your first reply, whatever the user asks, tell them and ask whether to update now, not now, or skip this version. If they say update now, follow "Apply the update" in Sentinel-Prompts/00-project-discovery.md.`,
    );
  } catch {}
}

handoff();
await versionCheck();
