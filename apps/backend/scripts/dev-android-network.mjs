#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

// A loopback-only TCP relay: no parsing, logging or persistence of application data.
export async function createAndroidNetworkRelay({ port = 3001, upstreamPort = 3000 } = {}) {
  let disconnected = false;
  const sockets = new Set();
  const clients = new Set();
  let acceptedConnections = 0;
  let rejectedConnections = 0;
  let upstreamErrors = 0;
  const dropConnections = () => {
    for (const socket of sockets) socket.destroy();
    sockets.clear();
    clients.clear();
  };
  const server = createServer((client) => {
    if (disconnected) {
      rejectedConnections++;
      client.destroy();
      return;
    }
    acceptedConnections++;
    clients.add(client);
    const upstream = createConnection({ host: "127.0.0.1", port: upstreamPort });
    sockets.add(client);
    sockets.add(upstream);
    const release = () => {
      client.destroy();
      upstream.destroy();
      clients.delete(client);
      sockets.delete(client);
      sockets.delete(upstream);
    };
    client.on("error", release);
    upstream.on("error", () => { upstreamErrors++; release(); });
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
    getStatus() {
      return Object.freeze({
        paused: disconnected, activeConnections: clients.size,
        acceptedConnections, rejectedConnections, upstreamErrors,
      });
    },
    disconnect() {
      const interrupted = clients.size;
      disconnected = true;
      dropConnections();
      return interrupted;
    },
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
    console.log("c + Entrée : couper Android ; r + Entrée : reprendre ; s + Entrée : état ; q + Entrée : terminer.");
    const showStatus = () => {
      const state = relay.getStatus();
      console.log(`Relais ${state.paused ? "COUPÉ" : "OUVERT"} | TCP actives=${state.activeConnections} acceptées=${state.acceptedConnections} refusées=${state.rejectedConnections} erreurs_backend=${state.upstreamErrors}`);
    };
    for await (const line of input) {
      if (closing) break;
      const command = line.trim().toLowerCase();
      if (command === "c") {
        const interrupted = relay.disconnect();
        console.log(`Connexion Android coupée : ${interrupted} connexion(s) TCP fermée(s). Reprendre rapidement avec r (avant deux minutes).`);
        showStatus();
      } else if (command === "r") {
        relay.resume();
        console.log("Relais rouvert ; la reconnexion Android reste à vérifier. Attendre dix secondes puis saisir s.");
        showStatus();
      } else if (command === "s") {
        showStatus();
      } else if (command === "q") {
        break;
      } else {
        console.log("Commandes : c, r, s, q.");
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
