import { expect, test } from "vitest";
import { parseDuoArguments, preflightDuoDevices, installDuoDevices, selectNewDuoRoom } from "./dev-android-duo-tools.mjs";
const selected = { host: "emulator-5554", guest: "emulator-5556" };
const devices = "List of devices attached\r\nemulator-5554\tdevice\r\nemulator-5556\tdevice\r\nusb-unused\tdevice\r\n";

test("requires two explicit distinct serials, without default-device ambiguity", () => {
  expect(parseDuoArguments(["--host", selected.host, "--guest", selected.guest])).toEqual(selected);
  for (const args of [[], ["--host", selected.host], ["--host", selected.host, "--guest", selected.host],
    ["--host", "-s", "--guest", "bad serial"], ["--host", selected.host, "--guest", selected.guest, "extra"]]) {
    expect(() => parseDuoArguments(args)).toThrow();
  }
});

test("rejects unavailable or unbooted second devices before any mutation", () => {
  for (const state of ["offline", "unauthorized", "missing"]) {
    const calls = [];
    const run = (args) => { calls.push(args); return devices.replace("emulator-5556\tdevice", state === "missing" ? "" : `emulator-5556\t${state}`); };
    expect(() => preflightDuoDevices(run, selected)).toThrow();
    expect(calls).toEqual([["devices"]]);
  }
  const calls = [];
  expect(() => preflightDuoDevices((args) => {
    calls.push(args);
    return args[0] === "devices" ? devices : args.includes("get-current-user") ? "0\r\n" : args[1] === selected.host ? "1" : "0";
  }, selected)).toThrow(/pas prêt/);
  expect(calls.every((args) => !args.includes("install") && !args.includes("reverse"))).toBe(true);
});

test("every install/reverse/restart targets only the selected serials and preserves app data", () => {
  const calls = [];
  const run = (args) => { calls.push(args); return args[0] === "devices" ? devices : args.includes("get-current-user") ? "0" : "1"; };
  preflightDuoDevices(run, selected);
  const apk = "C:\\Users\\Test User\\atoutia debug.apk";
  installDuoDevices(run, selected, apk);
  expect(calls.filter((args) => args.includes("install"))).toEqual([
    ["-s", selected.host, "install", "-r", apk], ["-s", selected.guest, "install", "-r", apk],
  ]);
  const mutations = calls.slice(5);
  expect(mutations).toHaveLength(8);
  expect(mutations.every((args) => args[0] === "-s" && [selected.host, selected.guest].includes(args[1]))).toBe(true);
  expect(calls.flat().some((arg) => ["clear", "uninstall", "kill-server", "reboot"].includes(arg))).toBe(false);
});

test("fresh room detection rejects ambiguity and disappearance rather than choosing another room", () => {
  const existing = new Set(["old"]);
  expect(selectNewDuoRoom(["old"], existing, null)).toBe(null);
  expect(selectNewDuoRoom(["new", "old"], existing, null)).toBe("new");
  expect(selectNewDuoRoom(["new", "old"], existing, "new")).toBe("new");
  for (const [ids, id] of [[["a", "b", "old"], null], [["different", "old"], "new"], [["old"], "new"]]) {
    expect(() => selectNewDuoRoom(ids, existing, id)).toThrow();
  }
});
