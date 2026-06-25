#!/usr/bin/env node
/**
 * deploy.mjs — push built theme files into the live TheLounge container.
 *
 * Uses `podman cp` via SSH to inject theme.css + theme.min.css directly into
 * the running container, bypassing yarn's content-hash cache (which would
 * silently serve a stale version when the package version number stays the same).
 *
 * Usage:
 *   npm run deploy                    # uses defaults below
 *   THELOUNGE_HOST=myserver npm run deploy
 *
 * Environment overrides:
 *   THELOUNGE_HOST      SSH host (default: oscar)
 *   THELOUNGE_CONTAINER Podman container name (default: thelounge-pod-thelounge)
 *   THELOUNGE_PKG_DIR   Path inside container to the installed package
 *                       (default: /var/opt/thelounge/packages/node_modules/thelounge-theme-chat)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const HOST      = process.env.THELOUNGE_HOST      ?? "oscar";
const CONTAINER = process.env.THELOUNGE_CONTAINER ?? "thelounge-pod-thelounge";
const PKG_DIR   = process.env.THELOUNGE_PKG_DIR   ??
  "/var/opt/thelounge/packages/node_modules/thelounge-theme-chat";

const FILES = ["theme.css", "theme.min.css"];

// Sanity-check built files exist
for (const f of FILES) {
  if (!existsSync(resolve(ROOT, f))) {
    console.error(`✗ Missing ${f} — run "npm run build" first`);
    process.exit(1);
  }
}

const run = (cmd, label) => {
  console.log(`→ ${label}`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    console.error(`✗ Failed: ${label}`);
    process.exit(1);
  }
};

// 1. Copy files to the remote host's /tmp
for (const f of FILES) {
  run(`scp ${resolve(ROOT, f)} root@${HOST}:/tmp/${f}`, `scp ${f} → ${HOST}:/tmp/`);
}

// 2. Inject each file into the running container via podman cp
for (const f of FILES) {
  run(
    `ssh root@${HOST} "podman cp /tmp/${f} ${CONTAINER}:${PKG_DIR}/${f}"`,
    `podman cp ${f} → ${CONTAINER}:${PKG_DIR}/`
  );
}

console.log(`\n✓ Deployed to ${CONTAINER} on ${HOST}`);
console.log("  Hard-refresh the browser to pick up the new CSS.");
