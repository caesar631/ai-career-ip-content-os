import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
const nullPlatformVersionPackagePath = fileURLToPath(
  new URL("../fixtures/null-platform-version-content-package.json", import.meta.url),
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

async function runModifiedContentPackage(mutateContentPackage) {
  const contentPackage = JSON.parse(await readFile(readyPackagePath, "utf8"));
  mutateContentPackage(contentPackage);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "content-package-readiness-"));
  const temporaryPackagePath = join(temporaryDirectory, "content-package.json");

  try {
    await writeFile(temporaryPackagePath, JSON.stringify(contentPackage), "utf8");
    return readReport(runContentCheck(temporaryPackagePath));
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

test("a complete content package with release approvals reports ready", () => {
  const report = readReport(runContentCheck(readyPackagePath));

  assert.deepEqual(report, {
    status: "ready",
    missing: [],
    platformVersionsAwaitingReleaseApproval: [],
    paidVideoGenerationBriefStatus: "not-required",
  });
});

test("a complete package with unapproved platform versions awaits owner approval", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    contentPackage.platformVersions.find(
      (platformVersion) => platformVersion.platform === "douyin",
    ).releaseApproval = "pending";
    contentPackage.platformVersions.find(
      (platformVersion) => platformVersion.platform === "bilibili",
    ).releaseApproval = "draft";
  });

  assert.deepEqual(report, {
    status: "awaiting-owner-approval",
    missing: [],
    platformVersionsAwaitingReleaseApproval: ["douyin", "bilibili"],
    paidVideoGenerationBriefStatus: "not-required",
  });
});

test("a paid-video package without a complete brief is blocked and names the missing fields", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    contentPackage.paidVideoGenerationBrief = { isRequired: true };
  });

  assert.deepEqual(report, {
    status: "blocked-by-paid-video-gate",
    missing: [
      "paidVideoGenerationBrief.purpose",
      "paidVideoGenerationBrief.quantity",
      "paidVideoGenerationBrief.acceptanceCriteria",
      "paidVideoGenerationBrief.costEstimate",
      "paidVideoGenerationBrief.stopCondition",
    ],
    platformVersionsAwaitingReleaseApproval: [],
    paidVideoGenerationBriefStatus: "incomplete",
  });
});

test("a complete paid-video brief without owner approval remains blocked", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    contentPackage.paidVideoGenerationBrief = {
      isRequired: true,
      purpose: "Show a workflow outcome that cannot be captured in a screen recording.",
      quantity: 1,
      acceptanceCriteria: "The result makes the workflow decision observable.",
      costEstimate: 80,
      stopCondition: "Stop after one rejected result.",
      ownerApproval: "pending",
    };
  });

  assert.deepEqual(report, {
    status: "blocked-by-paid-video-gate",
    missing: [],
    platformVersionsAwaitingReleaseApproval: [],
    paidVideoGenerationBriefStatus: "awaiting-owner-approval",
  });
});

test("a complete approved paid-video brief continues to normal readiness checks", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    contentPackage.paidVideoGenerationBrief = {
      isRequired: true,
      purpose: "Show a workflow outcome that cannot be captured in a screen recording.",
      quantity: 1,
      acceptanceCriteria: "The result makes the workflow decision observable.",
      costEstimate: 80,
      stopCondition: "Stop after one rejected result.",
      ownerApproval: "approved",
    };
    contentPackage.platformVersions.find(
      (platformVersion) => platformVersion.platform === "video-account",
    ).releaseApproval = "pending";
  });

  assert.deepEqual(report, {
    status: "awaiting-owner-approval",
    missing: [],
    platformVersionsAwaitingReleaseApproval: ["video-account"],
    paidVideoGenerationBriefStatus: "approved",
  });
});

test("a package missing required content is not reported ready", () => {
  const report = readReport(runContentCheck(incompletePackagePath));

  assert.deepEqual(report, {
    status: "incomplete",
    missing: [
      "coreTheme.careerProblem",
      "coreTheme.demonstration",
      "coreTheme.judgement",
      "platformVersions.xiaohongshu",
      "platformVersions.douyin",
      "platformVersions.video-account",
      "platformVersions.bilibili",
      "basicAsset",
    ],
    platformVersionsAwaitingReleaseApproval: [],
    paidVideoGenerationBriefStatus: "not-required",
  });
});

test("a package with an extra platform version is not reported ready", () => {
  const report = readReport(runContentCheck(duplicatePlatformVersionPackagePath));

  assert.notEqual(report.status, "ready");
});

test("a null platform version is reported as incomplete", () => {
  const report = readReport(runContentCheck(nullPlatformVersionPackagePath));

  assert.deepEqual(report.missing, [
    "platformVersions.xiaohongshu",
    "platformVersions.douyin",
    "platformVersions.video-account",
    "platformVersions.bilibili",
  ]);
  assert.equal(report.status, "incomplete");
});

test("each required content-package detail has an independent incomplete report", async (t) => {
  const missingDetailCases = [
    {
      name: "career problem",
      mutate: (contentPackage) => delete contentPackage.coreTheme.careerProblem,
      missing: "coreTheme.careerProblem",
    },
    {
      name: "demonstration",
      mutate: (contentPackage) => delete contentPackage.coreTheme.demonstration,
      missing: "coreTheme.demonstration",
    },
    {
      name: "judgement",
      mutate: (contentPackage) => delete contentPackage.coreTheme.judgement,
      missing: "coreTheme.judgement",
    },
    ...["xiaohongshu", "douyin", "video-account", "bilibili"].map((platform) => ({
      name: `${platform} platform version`,
      mutate: (contentPackage) => {
        contentPackage.platformVersions = contentPackage.platformVersions.filter(
          (platformVersion) => platformVersion.platform !== platform,
        );
      },
      missing: `platformVersions.${platform}`,
    })),
    {
      name: "public basic asset",
      mutate: (contentPackage) => {
        contentPackage.basicAsset.visibility = "private";
      },
      missing: "basicAsset",
    },
  ];

  for (const missingDetailCase of missingDetailCases) {
    await t.test(missingDetailCase.name, async () => {
      const report = await runModifiedContentPackage(missingDetailCase.mutate);

      assert.equal(report.status, "incomplete");
      assert.deepEqual(report.missing, [missingDetailCase.missing]);
    });
  }
});
