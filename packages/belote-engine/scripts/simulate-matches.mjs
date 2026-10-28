import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runCampaign, validateOptions } from "./simulation.mjs";

const FLAGS = {
  "--matches": "matches", "--start-seed": "startSeed",
  "--max-actions-per-match": "maxActionsPerMatch", "--max-duration-ms": "maxDurationMs",
  "--rules-version": "rulesVersion",
};

export function parseArguments(argv) {
  const options = {};
  let reportPath;
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (seen.has(flag)) throw new Error("Duplicate option: " + flag);
    seen.add(flag);
    if (value === undefined || value.startsWith("--")) throw new Error("Missing value for " + flag);
    if (flag === "--report") {
      if (!value.trim()) throw new Error("Report path cannot be empty.");
      reportPath = resolve(value);
    } else {
      if (!Object.hasOwn(FLAGS, flag)) throw new Error("Unknown option: " + flag);
      if (flag === "--rules-version") options.rulesVersion = value;
      else {
        if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error("Expected a decimal integer for " + flag);
        options[FLAGS[flag]] = Number(value);
      }
    }
  }
  return { options: validateOptions(options), reportPath };
}

export function main(argv) {
  try {
    if (argv.length === 1 && argv[0] === "--help") {
      process.stdout.write("Usage: node packages/belote-engine/scripts/simulate-matches.mjs [--matches N] [--start-seed N] [--max-actions-per-match N] [--max-duration-ms N] [--rules-version CLASSIC_LITIGE_WINNER|CLASSIC_LEGACY_LITIGE_TAKER] [--report FILE]\nBuild the engine first. Full matches use 1000 points. Report files must not exist. Exit: 0 passed, 1 failed/invalid, 2 incomplete.\n");
      return 0;
    }
    const { options, reportPath } = parseArguments(argv);
    const report = runCampaign(options, { onProgress: (completed) => process.stderr.write("Matches verified: " + completed + "/" + options.matches + "\n") });
    const json = JSON.stringify(report, null, 2) + "\n";
    process.stdout.write(json);
    if (reportPath !== undefined) writeFileSync(reportPath, json, { flag: "wx" });
    return report.status === "PASSED" ? 0 : report.status === "INCOMPLETE" ? 2 : 1;
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
