import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import test from "node:test";

const readyPackagePath = fileURLToPath(
  new URL("../fixtures/ready-content-package.json", import.meta.url),
);
const contentCheckPath = fileURLToPath(
  new URL("../bin/content-package-readiness.mjs", import.meta.url),
);

test("a complete approved content package reports ready", () => {
  const result = spawnSync(process.execPath, [contentCheckPath, readyPackagePath], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.deepEqual(report, {
    status: "ready",
    missing: [],
    awaitingApprovalFor: [],
    paidVideoGate: "not-required",
  });
});
