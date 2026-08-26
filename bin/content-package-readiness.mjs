import { readFile } from "node:fs/promises";

const contentPackagePath = process.argv[2];
const requiredPlatformVersionSet = ["xiaohongshu", "douyin", "video-account", "bilibili"];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getPlatformVersions(contentPackage) {
  return Array.isArray(contentPackage.platformVersions) ? contentPackage.platformVersions : [];
}

function hasPlatformVersionForPlatform(platformVersions, platform) {
  return platformVersions.some((platformVersion) => platformVersion?.platform === platform);
}

function hasReleaseApprovalForPlatformVersion(platformVersions, platform) {
  return platformVersions.some(
    (platformVersion) =>
      platformVersion?.platform === platform && platformVersion.releaseApproval === "approved",
  );
}

function findMissingRequirements(contentPackage) {
  const missing = [];
  const coreTheme = contentPackage.coreTheme ?? {};

  if (!hasText(coreTheme.careerProblem)) {
    missing.push("coreTheme.careerProblem");
  }
  if (!hasText(coreTheme.demonstration)) {
    missing.push("coreTheme.demonstration");
  }
  if (!hasText(coreTheme.judgement)) {
    missing.push("coreTheme.judgement");
  }

  const platformVersions = getPlatformVersions(contentPackage);
  const hasRequiredPlatformVersionSet = requiredPlatformVersionSet.every((platform) =>
    hasPlatformVersionForPlatform(platformVersions, platform),
  );
  for (const platform of requiredPlatformVersionSet) {
    if (!hasPlatformVersionForPlatform(platformVersions, platform)) {
      missing.push(`platformVersions.${platform}`);
    }
  }
  if (
    hasRequiredPlatformVersionSet &&
    platformVersions.length !== requiredPlatformVersionSet.length
  ) {
    missing.push("platformVersions.required-platform-version-set");
  }

  const hasPublicBasicAsset =
    hasText(contentPackage.basicAsset?.name) &&
    hasText(contentPackage.basicAsset?.reference) &&
    contentPackage.basicAsset?.visibility === "public";
  if (!hasPublicBasicAsset) {
    missing.push("basicAsset");
  }

  return missing;
}

function findPlatformVersionsAwaitingReleaseApproval(platformVersions) {
  return requiredPlatformVersionSet.filter(
    (platform) => !hasReleaseApprovalForPlatformVersion(platformVersions, platform),
  );
}

function assessPaidVideoGenerationBrief(contentPackage) {
  const paidVideoGenerationBrief = contentPackage.paidVideoGenerationBrief;
  if (!paidVideoGenerationBrief?.isRequired) {
    return { missing: [], status: "not-required" };
  }

  const missing = [];
  if (!hasText(paidVideoGenerationBrief.purpose)) {
    missing.push("paidVideoGenerationBrief.purpose");
  }
  if (!isPositiveNumber(paidVideoGenerationBrief.quantity)) {
    missing.push("paidVideoGenerationBrief.quantity");
  }
  if (!hasText(paidVideoGenerationBrief.acceptanceCriteria)) {
    missing.push("paidVideoGenerationBrief.acceptanceCriteria");
  }
  if (!isPositiveNumber(paidVideoGenerationBrief.costEstimate)) {
    missing.push("paidVideoGenerationBrief.costEstimate");
  }
  if (!hasText(paidVideoGenerationBrief.stopCondition)) {
    missing.push("paidVideoGenerationBrief.stopCondition");
  }

  if (missing.length > 0) {
    return { missing, status: "incomplete" };
  }

  return {
    missing: [],
    status:
      paidVideoGenerationBrief.paidVideoGenerationBriefApproval === "approved"
        ? "approved"
        : "awaiting-owner-approval",
  };
}

if (!contentPackagePath) {
  console.error("Provide a content package file path.");
  process.exitCode = 1;
} else {
  try {
    const contentPackage = JSON.parse(await readFile(contentPackagePath, "utf8"));
    const missingContentPackageRequirements = findMissingRequirements(contentPackage);
    const paidVideoGenerationBrief = assessPaidVideoGenerationBrief(contentPackage);
    const missing = [
      ...missingContentPackageRequirements,
      ...paidVideoGenerationBrief.missing,
    ];
    const platformVersionsAwaitingReleaseApproval =
      missingContentPackageRequirements.length === 0
        ? findPlatformVersionsAwaitingReleaseApproval(getPlatformVersions(contentPackage))
        : [];
    const status =
      missingContentPackageRequirements.length > 0
        ? "incomplete"
        : paidVideoGenerationBrief.status !== "not-required" &&
            paidVideoGenerationBrief.status !== "approved"
          ? "blocked-by-paid-video-gate"
          : platformVersionsAwaitingReleaseApproval.length > 0
            ? "awaiting-owner-approval"
            : "ready";
    console.log(
      JSON.stringify({
        status,
        missing,
        platformVersionsAwaitingReleaseApproval,
        paidVideoGenerationBriefStatus: paidVideoGenerationBrief.status,
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
