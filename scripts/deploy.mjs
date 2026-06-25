#!/usr/bin/env node
/**
 * deploy.mjs — push built theme files into the live TheLounge container.
 *
 * Two modes:
 *
 *   npm run deploy      — fast: podman cp files directly into the container.
 *                         Bypasses yarn's content-hash cache entirely.
 *                         Use this for all iterative work.
 *
 *   npm run reinstall   — full: pack a tgz, clear yarn cache for this package,
 *                         remove the old install, then yarn add fresh.
 *                         Simulates what `thelounge install <tgz>` should do.
 *                         Use this to verify a clean install works end-to-end.
 *
 * Environment overrides:
 *   THELOUNGE_HOST        SSH host                    (default: oscar)
 *   THELOUNGE_CONTAINER   Podman container name       (default: thelounge-pod-thelounge)
 *   THELOUNGE_YARN_DIR    yarn packages dir inside container
 *                         (default: /var/opt/thelounge/packages)
 */

import { execSync, execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG  = JSON.parse(
  execFileSync("cat", [resolve(ROOT, "package.json")], { encoding: "utf8" })
);
const PKG_NAME    = PKG.name;                        // thelounge-theme-chat
const PKG_VERSION = PKG.version;                     // 1.3.0

const HOST      = process.env.THELOUNGE_HOST      ?? "oscar";
const CONTAINER = process.env.THELOUNGE_CONTAINER ?? "thelounge-pod-thelounge";
const YARN_DIR  = process.env.THELOUNGE_YARN_DIR  ?? "/var/opt/thelounge/packages";
const PKG_DIR   = `${YARN_DIR}/node_modules/${PKG_NAME}`;

const MODE = process.argv[2] ?? "deploy"; // "deploy" | "reinstall"

const run = (cmd, label) => {
  console.log(`→ ${label}`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    console.error(`✗ Failed: ${label}`);
    process.exit(1);
  }
};

const ssh = (remoteCmd, label) =>
  run(`ssh root@${HOST} ${JSON.stringify(remoteCmd)}`, label);

// ── deploy mode ────────────────────────────────────────────────────────────
// Inject built files directly via podman cp — no yarn, no cache.
function deploy() {
  const files = ["theme.css", "theme.min.css"];
  for (const f of files) {
    if (!existsSync(resolve(ROOT, f))) {
      console.error(`✗ Missing ${f} — run "npm run build" first`);
      process.exit(1);
    }
  }
  for (const f of files) {
    run(`scp ${resolve(ROOT, f)} root@${HOST}:/tmp/${f}`, `scp ${f} → ${HOST}:/tmp/`);
    ssh(`podman cp /tmp/${f} ${CONTAINER}:${PKG_DIR}/${f}`,
        `podman cp ${f} → ${CONTAINER}:${PKG_DIR}/`);
  }
  console.log(`\n✓ Deployed to ${CONTAINER} on ${HOST} (podman cp)`);
  console.log("  Hard-refresh the browser to pick up the new CSS.");
}

// ── reinstall mode ─────────────────────────────────────────────────────────
// Pack a fresh tgz, clear yarn's stale cache entry, then yarn add from the
// tgz. This is the correct simulation of `thelounge install <local-tgz>`.
//
// Why yarn cache is a problem:
//   yarn uses the tgz content-hash as a cache key. When you repack the same
//   version number, the hash changes but yarn has an old entry under a
//   different key format (file: vs absolute path). It resolves the conflict
//   by skipping the new install and silently serving the cached version.
//
// The fix: wipe all cache entries for this package before yarn add so yarn
// is forced to extract the new tgz fresh.
function reinstall() {
  // 1. Pack locally
  console.log("→ npm pack");
  execSync("npm pack", { cwd: ROOT, stdio: "inherit" });

  const tgz = readdirSync(ROOT)
    .filter(f => f.startsWith(`${PKG_NAME}-${PKG_VERSION}`) && f.endsWith(".tgz"))
    .sort()
    .at(-1);
  if (!tgz) { console.error("✗ tgz not found after pack"); process.exit(1); }
  console.log(`  packed: ${tgz}`);

  // 2. Copy tgz to remote host
  run(`scp ${resolve(ROOT, tgz)} root@${HOST}:/tmp/${tgz}`,
      `scp ${tgz} → ${HOST}:/tmp/`);

  // 3. In container: wipe all yarn state for this package, then yarn add fresh.
  //    All in one exec to keep it atomic.
  //
  //    Why we must wipe yarn.lock too:
  //      yarn.lock stores the resolved path+hash of previous installs. When
  //      the lock has an old "file:../tmp/pkg.tgz#<hash>" entry and we now
  //      add "/tmp/pkg.tgz" (absolute), yarn detects both resolve to the same
  //      cache dir and skips extraction — silently serving stale files.
  //      Removing yarn.lock forces a clean resolution from scratch.
  const containerScript = [
    // 1. Purge yarn's in-memory + disk cache for this package
    `yarn cache clean ${PKG_NAME} 2>/dev/null || true`,
    `rm -rf "/home/node/.cache/yarn/v6/npm-${PKG_NAME}-"*`,
    // 2. Wipe the stale lockfile entry (the root cause of the skip-warning)
    `rm -f ${YARN_DIR}/yarn.lock`,
    // 3. Remove the old installed package directory
    `rm -rf ${PKG_DIR}`,
    // 4. Fresh install — yarn will extract the new tgz and install it.
    //    NOTE: yarn 1 emits a "same destination … skipping" warning because it
    //    resolves both the absolute path (/tmp/pkg.tgz) and its own internally
    //    computed relative form (file:../../../../tmp/pkg.tgz) from the CWD as
    //    two separate patterns.  "skipping" means the second duplicate pattern
    //    is skipped — NOT the install itself.  The installed CSS is always
    //    fresh (verified by grep).  This warning cannot be suppressed without
    //    patching yarn 1.
    `cd ${YARN_DIR} && yarn add /tmp/${tgz}`,
  ].join(" && ");

  ssh(`podman exec ${CONTAINER} sh -c ${JSON.stringify(containerScript)}`,
      `reinstall ${PKG_NAME}@${PKG_VERSION} via yarn add`);

  console.log(`\n✓ Reinstalled ${PKG_NAME}@${PKG_VERSION} in ${CONTAINER} on ${HOST}`);
  console.log("  Hard-refresh the browser to pick up the new CSS.");
}

if (MODE === "reinstall") {
  reinstall();
} else {
  deploy();
}
