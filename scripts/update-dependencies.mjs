#!/usr/bin/env node
// Bumps every dependency in package.json to its latest version, reinstalls,
// and regenerates the Prisma client. Run from the repo root:
//   node scripts/update-dependencies.mjs
//
// This only performs the mechanical upgrade. Build/lint/test verification
// and the commit + PR are handled by the "update-dependencies" skill.

import { execFileSync } from 'node:child_process';

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
}

run('npx', ['--yes', 'npm-check-updates', '-u']);
run('npm', ['install']);
run('npm', ['run', 'db:generate']);

console.log(`
Dependencies bumped to latest and package-lock.json regenerated.
Next: run lint, build, and the test suite, review any major-version
changelogs for breaking changes, then commit and open a PR.
`);
