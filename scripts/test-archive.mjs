#!/usr/bin/env node
// Run the Playwright suite, then archive the HTML report into a timestamped,
// never-overwritten folder under test-archive/ and append a row to the index.
// The live playwright-report/ still gets overwritten each run (that's Playwright's
// default); this keeps a permanent local copy of every run alongside a summary.
//
//   node scripts/test-archive.mjs            # full suite, archive, open report
//   node scripts/test-archive.mjs --no-open  # don't open the report (e.g. from a hook)
//   node scripts/test-archive.mjs --project=chromium   # any playwright args pass through
//
// Archives live in test-archive/ (gitignored — local history). CI artifacts +
// `git log tests/` are the shareable history; this is your machine-local logbook.

import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// Load local-only E2E secrets (.e2e.env, gitignored) so the logged-in flows run.
// Existing env vars win (CI passes them directly); KEY=VALUE lines, # comments.
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const [, k, raw] = m;
    if (!(k in process.env)) process.env[k] = raw.replace(/^["']|["']$/g, '');
  }
}
loadEnvFile(join(ROOT, '.e2e.env'));

const ARCHIVE_DIR = join(ROOT, 'test-archive');
const REPORT_DIR = join(ROOT, 'playwright-report');
const RESULTS_JSON = join(ROOT, 'test-results', 'results.json');
const INDEX = join(ARCHIVE_DIR, 'INDEX.md');

// Split our own flags from args forwarded to `playwright test`.
const rawArgs = process.argv.slice(2);
const noOpen = rawArgs.includes('--no-open');
const pwArgs = rawArgs.filter((a) => a !== '--no-open');

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'nogit';
const sha = git(['rev-parse', '--short', 'HEAD']) || 'nosha';
const subject = git(['log', '-1', '--pretty=%s']) || '';

// Sortable local timestamp: 2026-06-07_19-07-42
const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
const slug = `${stamp}__${branch.replace(/[^\w.-]/g, '-')}__${sha}`;
const dest = join(ARCHIVE_DIR, slug);

console.log(`\n▶ Running Playwright suite (archive → test-archive/${slug})\n`);

// 1. Run the tests. Inherit stdio so you see live progress. Don't abort the
//    archive on failure — a failed run is exactly what you want recorded.
const run = spawnSync('npx', ['playwright', 'test', ...pwArgs], { stdio: 'inherit', env: process.env });
const exitCode = run.status ?? 1;

// 2. Read the machine-readable result for counts.
let stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 0 };
if (existsSync(RESULTS_JSON)) {
  try {
    stats = { ...stats, ...JSON.parse(readFileSync(RESULTS_JSON, 'utf8')).stats };
  } catch {
    /* leave defaults */
  }
}
const passed = stats.expected;
const failed = stats.unexpected;
const flaky = stats.flaky;
const skipped = stats.skipped;
const total = passed + failed + flaky + skipped;
const status = failed > 0 ? 'FAIL' : 'PASS';
const durationS = Math.round((stats.duration || 0) / 100) / 10;

// 3. Snapshot the report + a summary into the timestamped folder.
mkdirSync(dest, { recursive: true });
if (existsSync(REPORT_DIR)) cpSync(REPORT_DIR, join(dest, 'report'), { recursive: true });
if (existsSync(RESULTS_JSON)) cpSync(RESULTS_JSON, join(dest, 'results.json'));

const summary = [
  `# Test run — ${stamp}`,
  ``,
  `- **Result:** ${status} (exit ${exitCode})`,
  `- **Branch / commit:** ${branch} @ ${sha} — ${subject}`,
  `- **Counts:** ${passed} passed · ${failed} failed · ${flaky} flaky · ${skipped} skipped (${total} total)`,
  `- **Duration:** ${durationS}s`,
  `- **Args:** ${pwArgs.length ? pwArgs.join(' ') : '(full suite)'}`,
  ``,
  `Open this run's report:  \`npx playwright show-report test-archive/${slug}/report\``,
  ``,
].join('\n');
writeFileSync(join(dest, 'summary.md'), summary);

// 4. Append a row to the index (the local logbook of every run).
if (!existsSync(INDEX)) {
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  writeFileSync(
    INDEX,
    `# Test archive — local run history\n\nEvery \`npm run test:archive\` (and every push, via the pre-push hook) appends a row.\nReports are in the dated sibling folders. Open one with \`npx playwright show-report test-archive/<folder>/report\`.\n\n| When | Result | Pass | Fail | Skip | Branch @ commit | Note |\n| --- | --- | ---: | ---: | ---: | --- | --- |\n`,
  );
}
appendFileSync(
  INDEX,
  `| ${stamp} | ${status} | ${passed} | ${failed} | ${skipped} | ${branch} @ ${sha} | ${subject.replace(/\|/g, '/').slice(0, 60)} |\n`,
);

console.log(`\n✓ Archived → test-archive/${slug}  (${status}: ${passed}✓ ${failed}✗ ${skipped}–)\n`);

// 5. Open the archived report (detached, so this script exits and the server keeps serving).
if (!noOpen) {
  const show = spawn('npx', ['playwright', 'show-report', join(dest, 'report')], {
    detached: true,
    stdio: 'ignore',
  });
  show.unref();
  console.log(`Opening report… (npx playwright show-report test-archive/${slug}/report)`);
}

process.exit(exitCode);
