import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('development refuses missing or local database configuration before starting services', () => {
  const root = mkdtempSync(join(tmpdir(), 'parth-local-cloud-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'bin'));
    copyFileSync(new URL('./dev.sh', import.meta.url), join(root, 'scripts/dev.sh'));
    for (const tool of ['java', 'node', 'npm', 'openssl', 'curl', 'lsof', 'pgrep']) {
      writeFileSync(join(root, 'bin', tool), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    }
    for (const [url, message] of [
      ['', /Set SPRING_DATASOURCE_URL/],
      ['jdbc:postgresql://localhost:5432/example', /Local databases are disabled/],
      ['jdbc:postgresql://127.0.0.1:5432/example', /Local databases are disabled/],
      ['jdbc:postgresql://[::1]:5432/example', /Local databases are disabled/],
      ['jdbc:postgresql://cloud.example:5432/example', /managed database username and password/],
    ]) {
      writeFileSync(join(root, '.env'), `SPRING_DATASOURCE_URL='${url}'\nPOSTGRES_USER=\nPOSTGRES_PASSWORD=\n`);
      const run = spawnSync('/bin/sh', [join(root, 'scripts/dev.sh')], {
        env: { PATH: `${join(root, 'bin')}:/usr/bin:/bin`, JAVA_HOME: root }, encoding: 'utf8', timeout: 3000,
      });
      assert.equal(run.status, 1);
      assert.match(run.stderr, message);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
