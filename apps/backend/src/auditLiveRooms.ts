import { auditSQLiteLiveRooms } from "./sqliteLiveRoomAudit.js";

try {
  const databasePath = process.env.ATOUTIA_DATABASE_PATH;
  if (!databasePath) throw new Error("An explicit audit database path is required.");
  const report = auditSQLiteLiveRooms({ databasePath });
  console.log(JSON.stringify(report, null, 2));
  // An incomplete inventory is visible in JSON and also fails the CLI for automation.
  if (report.invalidRoomDocuments > 0 || report.durableResultRows === null) {
    process.exitCode = 2;
  }
} catch {
  // Do not echo paths, credentials or potentially sensitive parser exceptions.
  console.error("Room audit failed. Check ATOUTIA_DATABASE_PATH (explicit absolute path to an existing isolated database) and its schema. No backend was started.");
  process.exitCode = 1;
}
