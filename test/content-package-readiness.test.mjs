import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import test from "node:test";

const readyPackagePath = fileURLToPath(
  new URL("../fixtures/ready-content-package.json", import.meta.url),
);
const incompletePackagePath = fileURLToPath(
  new URL("../fixtures/incomplete-content-package.json", import.meta.url),
);
const duplicatePlatformVersionPackagePath = fileURLToPath(
  new URL("../fixtures/duplicate-platform-version-content-package.json", import.meta.url),
);
const contentCheckPath = fileURLToPath(
  new URL("../bin/content-package-readiness.mjs", import.meta.url),
);

function runContentCheck(contentPackagePath) {
  return spawnSync(process.execPath, [contentCheckPath, contentPackagePath], {
    encoding: "utf8",
  });
}

function readReport(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

test("a complete approved content package reports ready", () => {
  const report = readReport(runContentCheck(readyPackagePath));

  assert.deepEqual(report, {
    status: "ready",
    missing: [],
    awaitingApprovalFor: [],
    paidVideoGate: "not-required",
  });
});

test("a package missing required content is not reported ready", () => {
  const report = readReport(runContentCheck(incompletePackagePath));

  assert.notEqual(report.status, "ready");
});

test("a package with an extra platform version is not reported ready", () => {
  const report = readReport(runContentCheck(duplicatePlatformVersionPackagePath));

  assert.notEqual(report.status, "ready");
});
