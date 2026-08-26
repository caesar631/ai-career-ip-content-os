import { readFile } from "node:fs/promises";

const contentPackagePath = process.argv[2];
const requiredPlatformVersionSet = ["xiaohongshu", "douyin", "video-account", "bilibili"];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
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

function isReadyContentPackage(contentPackage, missing) {
  const platformVersions = getPlatformVersions(contentPackage);
  const hasReleaseApprovalForRequiredPlatformVersionSet =
    platformVersions.length === requiredPlatformVersionSet.length &&
    requiredPlatformVersionSet.every((platform) =>
      hasReleaseApprovalForPlatformVersion(platformVersions, platform),
    );

  return (
    missing.length === 0 &&
    hasReleaseApprovalForRequiredPlatformVersionSet &&
    !contentPackage.paidVideoGenerationBrief?.isRequired
  );
}

if (!contentPackagePath) {
  console.error("Provide a content package file path.");
  process.exitCode = 1;
} else {
  try {
    const contentPackage = JSON.parse(await readFile(contentPackagePath, "utf8"));
    const missing = findMissingRequirements(contentPackage);
    const isReady = isReadyContentPackage(contentPackage, missing);
    console.log(
      JSON.stringify({
        status: missing.length > 0 ? "incomplete" : isReady ? "ready" : "not-ready",
        missing,
        platformVersionsAwaitingReleaseApproval: [],
        paidVideoGenerationBriefStatus: contentPackage.paidVideoGenerationBrief?.isRequired
          ? "not-assessed"
          : "not-required",
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
