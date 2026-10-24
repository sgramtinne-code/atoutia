#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

// A loopback-only TCP relay: no parsing, logging or persistence of application data.
export async function createAndroidNetworkRelay({ port = 3001, upstreamPort = 3000 } = {}) {
  let disconnected = false;
  const sockets = new Set();
  const dropConnections = () => {
    for (const socket of sockets) socket.destroy();
    sockets.clear();
  };
  const server = createServer((client) => {
    if (disconnected) {
      client.destroy();
      return;
    }
    const upstream = createConnection({ host: "127.0.0.1", port: upstreamPort });
    sockets.add(client);
    sockets.add(upstream);
    const release = () => {
      client.destroy();
      upstream.destroy();
      sockets.delete(client);
      sockets.delete(upstream);
    };
    client.on("error", release);
    upstream.on("error", release);
    client.on("close", release);
    upstream.on("close", release);
    client.pipe(upstream);
    upstream.pipe(client);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  return {
    port: server.address().port,
    disconnect() { disconnected = true; dropConnections(); },
    resume() { disconnected = false; },
    async close() {
      disconnected = true;
      dropConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

async function main() {
  const adb = process.env.ATOUTIA_ADB?.trim() || "adb";
  const adbCommand = (...args) => {
    const result = spawnSync(adb, args, { stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("La commande ADB a échoué.");
  };
  const reverse = (port) => adbCommand("reverse", "tcp:3000", `tcp:${port}`);
  const relay = await createAndroidNetworkRelay();
  const input = createInterface({ input: process.stdin, output: process.stdout });
  let closing = false;
  const stop = () => { closing = true; input.close(); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  input.on("SIGINT", stop);
  try {
    reverse(3001);
    // Start before creating the room; discard any HTTP connection using the old route.
    adbCommand("shell", "am", "force-stop", "tech.devoo.atoutia");
    adbCommand("shell", "am", "start", "-n", "tech.devoo.atoutia/.MainActivity");
    console.log("Relais Android actif : 127.0.0.1:3001 → 127.0.0.1:3000.");
    console.log("Application relancée pour utiliser le relais ; créer maintenant le nouveau salon.");
    console.log("Backend et PNJ restent en connexion directe. Garder ce terminal ouvert.");
    console.log("c + Entrée : couper Android ; r + Entrée : reprendre ; q + Entrée : terminer.");
    for await (const line of input) {
      if (closing) break;
      const command = line.trim().toLowerCase();
      if (command === "c") {
        relay.disconnect();
        console.log("Connexion Android coupée. Reprendre rapidement avec r (avant deux minutes).");
      } else if (command === "r") {
        relay.resume();
        console.log("Connexion Android rétablie ; attendre sa reconnexion automatique.");
      } else if (command === "q") {
        break;
      } else {
        console.log("Commandes : c, r, q.");
      }
    }
  } finally {
    input.close();
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    await relay.close();
    reverse(3000);
    console.log("ADB reverse restauré vers le backend direct (port 3000).");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("Le relais réseau n’a pas pu démarrer ou restaurer ADB. Vérifier le port 3001, ATOUTIA_ADB et adb devices ; rétablir adb reverse tcp:3000 tcp:3000 si nécessaire.");
    process.exitCode = 1;
  });
}
