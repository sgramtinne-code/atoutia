import { execFileSync } from "node:child_process";

export function resolveAdbInstallPath(
  adbPath,
  apkPath,
  { platform = process.platform, run = execFileSync } = {},
) {
  if (platform !== "linux" || !/\.exe$/i.test(adbPath)) {
    return apkPath;
  }

  // Windows ADB launched from WSL must receive a Windows/UNC file path.
  // Pass arguments directly, without a shell, so spaces stay in one argument.
  const converted = run("wslpath", ["-w", apkPath], {
    encoding: "utf8",
  }).trim();

  if (converted.length === 0) {
    throw new Error("wslpath returned an empty Windows APK path.");
  }

  return converted;
}
