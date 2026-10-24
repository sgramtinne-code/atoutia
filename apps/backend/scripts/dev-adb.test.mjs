import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAdbInstallPath } from "./dev-adb.mjs";

const apk = "/home/tester/Projet avec espaces/app-debug.apk";
const windowsApk = "\\\\wsl.localhost\\Ubuntu\\home\\tester\\Projet avec espaces\\app-debug.apk";
const unexpectedConversion = () => assert.fail("No path conversion should run");

test("native Linux ADB receives the original APK path", () => {
  assert.equal(resolveAdbInstallPath("/opt/android/adb", apk, {
    platform: "linux", run: unexpectedConversion,
  }), apk);
});

test("Windows host does not invoke wslpath", () => {
  const path = "C:\\Projects\\app-debug.apk";
  assert.equal(resolveAdbInstallPath("C:\\Android\\adb.exe", path, {
    platform: "win32", run: unexpectedConversion,
  }), path);
});

test("WSL converts the APK for Windows ADB and preserves spaces without a shell", () => {
  const calls = [];
  const result = resolveAdbInstallPath("/mnt/c/Android/adb.exe", apk, {
    platform: "linux",
    run: (...args) => { calls.push(args); return windowsApk + "\r\n"; },
  });
  assert.equal(result, windowsApk);
  assert.deepEqual(calls, [["wslpath", ["-w", apk], { encoding: "utf8" }]]);
});

test("Windows executable suffix is case insensitive", () => {
  assert.equal(resolveAdbInstallPath("/mnt/c/Android/ADB.EXE", apk, {
    platform: "linux", run: () => windowsApk + "\n",
  }), windowsApk);
});

test("an empty conversion fails instead of installing with an invalid path", () => {
  assert.throws(() => resolveAdbInstallPath("/mnt/c/Android/adb.exe", apk, {
    platform: "linux", run: () => "\n",
  }), /empty Windows APK path/);
});

test("a failed conversion is propagated instead of falling back to the Linux path", () => {
  const failure = new Error("wslpath unavailable");
  assert.throws(() => resolveAdbInstallPath("/mnt/c/Android/adb.exe", apk, {
    platform: "linux", run: () => { throw failure; },
  }), (error) => error === failure);
});
