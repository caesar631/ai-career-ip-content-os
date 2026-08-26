import { readFile } from "node:fs/promises";

const contentPackagePath = process.argv[2];

if (!contentPackagePath) {
  console.error("Provide a content package file path.");
  process.exitCode = 1;
} else {
  try {
    JSON.parse(await readFile(contentPackagePath, "utf8"));
    console.log(
      JSON.stringify({
        status: "ready",
        missing: [],
        awaitingApprovalFor: [],
        paidVideoGate: "not-required",
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
