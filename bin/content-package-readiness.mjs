import { readFile } from "node:fs/promises";

const contentPackagePath = process.argv[2];
const requiredPlatforms = ["xiaohongshu", "douyin", "video-account", "bilibili"];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isReadyContentPackage(contentPackage) {
  const hasCompleteCoreTheme =
    hasText(contentPackage.coreTheme?.careerProblem) &&
    hasText(contentPackage.coreTheme?.demonstration) &&
    hasText(contentPackage.coreTheme?.judgement);
  const hasApprovedPublishTargets = requiredPlatforms.every((platform) =>
    contentPackage.publishTargets?.some(
      (target) => target.platform === platform && target.approved === true,
    ),
  );
  const hasPublicBasicAsset =
    hasText(contentPackage.basicAsset?.name) &&
    hasText(contentPackage.basicAsset?.reference) &&
    contentPackage.basicAsset?.visibility === "public";

  return hasCompleteCoreTheme && hasApprovedPublishTargets && hasPublicBasicAsset && !contentPackage.paidVideo?.required;
}

if (!contentPackagePath) {
  console.error("Provide a content package file path.");
  process.exitCode = 1;
} else {
  try {
    const contentPackage = JSON.parse(await readFile(contentPackagePath, "utf8"));
    const isReady = isReadyContentPackage(contentPackage);
    console.log(
      JSON.stringify({
        status: isReady ? "ready" : "not-ready",
        missing: [],
        awaitingApprovalFor: [],
        paidVideoGate: contentPackage.paidVideo?.required ? "not-assessed" : "not-required",
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
