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
const awaitingOwnerApprovalPackagePath = fileURLToPath(
  new URL("../fixtures/awaiting-owner-approval-content-package.json", import.meta.url),
);
const blockedByPaidVideoGatePackagePath = fileURLToPath(
  new URL("../fixtures/blocked-by-paid-video-gate-content-package.json", import.meta.url),
);
const duplicatePlatformVersionPackagePath = fileURLToPath(
  new URL("../fixtures/duplicate-platform-version-content-package.json", import.meta.url),
);
const nullPlatformVersionPackagePath = fileURLToPath(
  new URL("../fixtures/null-platform-version-content-package.json", import.meta.url),
);
const starterContentPackagePath = fileURLToPath(
  new URL("../templates/content-package-starter.json", import.meta.url),
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

function platformVersionStatuses(statusesByPlatform = {}) {
  return ["xiaohongshu", "douyin", "video-account", "bilibili"].map((platform) => ({
    platform,
    status: statusesByPlatform[platform] ?? "approved",
  }));
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
    platformVersionStatuses: platformVersionStatuses(),
    paidVideoGenerationBriefStatus: "not-required",
    nextStep: { action: "ready-for-owner-release-decision", items: [] },
  });
});

test("documented example packages run with their stated outcomes", async (t) => {
  const documentedExampleCases = [
    { name: "ready", path: readyPackagePath, status: "ready" },
    { name: "incomplete", path: incompletePackagePath, status: "incomplete" },
    {
      name: "awaiting owner approval",
      path: awaitingOwnerApprovalPackagePath,
      status: "awaiting-owner-approval",
    },
    {
      name: "blocked by paid-video gate",
      path: blockedByPaidVideoGatePackagePath,
      status: "blocked-by-paid-video-gate",
    },
  ];

  for (const documentedExampleCase of documentedExampleCases) {
    await t.test(documentedExampleCase.name, () => {
      const report = readReport(runContentCheck(documentedExampleCase.path));

      assert.equal(report.status, documentedExampleCase.status);
    });
  }
});

test("the copyable starter content package runs as incomplete", () => {
  const report = readReport(runContentCheck(starterContentPackagePath));

  assert.equal(report.status, "incomplete");
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
    platformVersionStatuses: platformVersionStatuses({
      douyin: "awaiting-release-approval",
      bilibili: "awaiting-release-approval",
    }),
    paidVideoGenerationBriefStatus: "not-required",
    nextStep: {
      action: "approve-platform-versions",
      items: ["douyin", "bilibili"],
    },
  });
});

test("a paid-video package without a complete brief is blocked and names the missing fields", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    contentPackage.paidVideoGenerationBrief = { isRequired: true };
  });

  const missingPaidVideoGenerationBriefFields = [
    "paidVideoGenerationBrief.purpose",
    "paidVideoGenerationBrief.quantity",
    "paidVideoGenerationBrief.acceptanceCriteria",
    "paidVideoGenerationBrief.costEstimate",
    "paidVideoGenerationBrief.stopCondition",
  ];

  assert.deepEqual(report, {
    status: "blocked-by-paid-video-gate",
    missing: missingPaidVideoGenerationBriefFields,
    platformVersionsAwaitingReleaseApproval: [],
    platformVersionStatuses: platformVersionStatuses(),
    paidVideoGenerationBriefStatus: "incomplete",
    nextStep: {
      action: "complete-paid-video-generation-brief",
      items: missingPaidVideoGenerationBriefFields,
    },
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
      paidVideoGenerationBriefApproval: "pending",
    };
  });

  assert.deepEqual(report, {
    status: "blocked-by-paid-video-gate",
    missing: [],
    platformVersionsAwaitingReleaseApproval: [],
    platformVersionStatuses: platformVersionStatuses(),
    paidVideoGenerationBriefStatus: "awaiting-owner-approval",
    nextStep: {
      action: "approve-paid-video-generation-brief",
      items: ["paidVideoGenerationBrief.paidVideoGenerationBriefApproval"],
    },
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
      paidVideoGenerationBriefApproval: "approved",
    };
    contentPackage.platformVersions.find(
      (platformVersion) => platformVersion.platform === "video-account",
    ).releaseApproval = "pending";
  });

  assert.deepEqual(report, {
    status: "awaiting-owner-approval",
    missing: [],
    platformVersionsAwaitingReleaseApproval: ["video-account"],
    platformVersionStatuses: platformVersionStatuses({
      "video-account": "awaiting-release-approval",
    }),
    paidVideoGenerationBriefStatus: "approved",
    nextStep: {
      action: "approve-platform-versions",
      items: ["video-account"],
    },
  });
});

test("a complete approved paid-video brief with approved platform versions reports ready", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    contentPackage.paidVideoGenerationBrief = {
      isRequired: true,
      purpose: "Show a workflow outcome that cannot be captured in a screen recording.",
      quantity: 1,
      acceptanceCriteria: "The result makes the workflow decision observable.",
      costEstimate: 80,
      stopCondition: "Stop after one rejected result.",
      paidVideoGenerationBriefApproval: "approved",
    };
  });

  assert.deepEqual(report, {
    status: "ready",
    missing: [],
    platformVersionsAwaitingReleaseApproval: [],
    platformVersionStatuses: platformVersionStatuses(),
    paidVideoGenerationBriefStatus: "approved",
    nextStep: { action: "ready-for-owner-release-decision", items: [] },
  });
});

test("a package missing required content is not reported ready", () => {
  const report = readReport(runContentCheck(incompletePackagePath));
  const missingContentPackageRequirements = [
    "coreTheme.careerProblem",
    "coreTheme.demonstration",
    "coreTheme.judgement",
    "platformVersions.xiaohongshu",
    "platformVersions.douyin",
    "platformVersions.video-account",
    "platformVersions.bilibili",
    "basicAsset",
  ];

  assert.deepEqual(report, {
    status: "incomplete",
    missing: missingContentPackageRequirements,
    platformVersionsAwaitingReleaseApproval: [],
    platformVersionStatuses: platformVersionStatuses({
      xiaohongshu: "missing",
      douyin: "missing",
      "video-account": "missing",
      bilibili: "missing",
    }),
    paidVideoGenerationBriefStatus: "not-required",
    nextStep: {
      action: "complete-content-package",
      items: missingContentPackageRequirements,
    },
  });
});

test("an incomplete package distinguishes missing and unapproved platform versions", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    delete contentPackage.coreTheme.careerProblem;
    contentPackage.platformVersions = contentPackage.platformVersions.filter(
      (platformVersion) => platformVersion.platform !== "xiaohongshu",
    );
    contentPackage.platformVersions.find(
      (platformVersion) => platformVersion.platform === "douyin",
    ).releaseApproval = "pending";
  });

  assert.deepEqual(report, {
    status: "incomplete",
    missing: ["coreTheme.careerProblem", "platformVersions.xiaohongshu"],
    platformVersionsAwaitingReleaseApproval: ["douyin"],
    platformVersionStatuses: platformVersionStatuses({
      xiaohongshu: "missing",
      douyin: "awaiting-release-approval",
    }),
    paidVideoGenerationBriefStatus: "not-required",
    nextStep: {
      action: "complete-content-package",
      items: ["coreTheme.careerProblem", "platformVersions.xiaohongshu"],
    },
  });
});

test("a content package resolves multiple blockers in readiness-priority order", async () => {
  const report = await runModifiedContentPackage((contentPackage) => {
    delete contentPackage.coreTheme.careerProblem;
    contentPackage.platformVersions.find(
      (platformVersion) => platformVersion.platform === "douyin",
    ).releaseApproval = "pending";
    contentPackage.paidVideoGenerationBrief = { isRequired: true };
  });

  assert.equal(report.status, "incomplete");
  assert.deepEqual(report.nextStep, {
    action: "complete-content-package",
    items: ["coreTheme.careerProblem"],
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
