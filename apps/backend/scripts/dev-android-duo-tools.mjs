export function parseDuoArguments(args) {
  if (args.length !== 4 || args[0] !== "--host" || args[2] !== "--guest" ||
      !args[1] || !args[3] || ![args[1], args[3]].every((serial) => /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(serial)) || args[1] === args[3]) {
    throw new Error("Usage: node apps/backend/scripts/dev-android-duo.mjs --host <serial> --guest <different serial>");
  }
  return Object.freeze({ host: args[1], guest: args[3] });
}

export function validateDuoDevices(output, { host, guest }) {
  const devices = new Map(output.split(/\r?\n/).map((line) => line.trim().split(/\s+/)).filter((parts) => parts.length >= 2));
  for (const serial of [host, guest]) {
    if (devices.get(serial) !== "device") throw new Error(`Android ${serial} absent, hors ligne ou non autorisé. Vérifier adb devices avant de continuer.`);
  }
}

export function preflightDuoDevices(runAdb, selected) {
  validateDuoDevices(runAdb(["devices"]), selected);
  // Inspect both devices before the first install, reverse or app restart.
  for (const serial of [selected.host, selected.guest]) {
    if (runAdb(["-s", serial, "shell", "getprop", "sys.boot_completed"]).trim() !== "1" ||
        !/^\d+$/.test(runAdb(["-s", serial, "shell", "am", "get-current-user"]).trim())) {
      throw new Error(`Android ${serial} n’est pas prêt. Attendre son démarrage complet.`);
    }
  }
}

export function installDuoDevices(runAdb, selected, apkPath) {
  for (const serial of [selected.host, selected.guest]) {
    const target = (...args) => runAdb(["-s", serial, ...args]);
    target("reverse", "tcp:3000", "tcp:3000");
    target("shell", "am", "force-stop", "tech.devoo.atoutia");
    target("install", "-r", apkPath);
    target("shell", "am", "start", "-n", "tech.devoo.atoutia/.MainActivity");
  }
}

export function selectNewDuoRoom(sessionIds, existing, selectedId) {
  const added = sessionIds.filter((id) => !existing.has(id));
  if (added.length > 1 || (selectedId && added.some((id) => id !== selectedId))) {
    throw new Error("Plusieurs nouveaux salons détectés. Arrêter les autres lanceurs et recommencer ce test avec un seul nouveau salon.");
  }
  if (selectedId && !added.includes(selectedId)) throw new Error("Le salon du test n’est plus disponible. Relancer le test.");
  return selectedId || added[0] || null;
}
