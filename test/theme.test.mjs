import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "theme.css"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** Strip CSS comments so structural checks don't match commented-out code. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("braces are balanced", () => {
  const open = (code.match(/\{/g) || []).length;
  const close = (code.match(/\}/g) || []).length;
  assert.equal(open, close, `unbalanced braces: ${open} '{' vs ${close} '}'`);
});

test("no leftover editor/merge conflict markers", () => {
  assert.doesNotMatch(css, /^(<{7}|={7}|>{7})/m, "merge conflict marker present");
});

test("defines the root design-token block", () => {
  assert.match(code, /:root\s*\{/, "missing :root token block");
});

test("ships automatic light/dark via prefers-color-scheme", () => {
  const count = (code.match(/@media\s*\(prefers-color-scheme:\s*dark\)/g) || [])
    .length;
  assert.ok(count >= 1, "no dark-mode media query");
});

test("all 32 nick colours are defined for both light and dark modes", () => {
  for (let i = 1; i <= 32; i++) {
    const matches = (
      code.match(new RegExp(`\\.user\\.color-${i}(?![0-9])`, "g")) || []
    ).length;
    assert.ok(
      matches >= 2,
      `.user.color-${i} should be defined in both modes (found ${matches})`,
    );
  }
});

test("accessibility: honours reduced motion and uses focus-visible", () => {
  assert.match(
    code,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
    "missing prefers-reduced-motion handling",
  );
  assert.match(code, /:focus-visible/, "missing :focus-visible styling");
});

test("re-themes TheLounge's hardcoded-white floating menus", () => {
  for (const sel of [".textcomplete-menu", "#context-menu", ".mentions-popup"]) {
    assert.ok(code.includes(sel), `floating menu ${sel} is not themed`);
  }
});

test("themes real link-preview markup, not dead legacy selectors", () => {
  assert.ok(code.includes(".toggle-content"), "missing .toggle-content styling");
  // These classes do not exist in modern TheLounge — guard against regressions.
  assert.ok(
    !code.includes(".autocomplete-popup"),
    "dead .autocomplete-popup selector reintroduced",
  );
  assert.ok(
    !/\.preview\s+\.title/.test(code),
    "dead .preview .title selector reintroduced",
  );
});

test("every referenced custom property is defined", () => {
  const defined = new Set(
    [...code.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]),
  );
  const used = new Set(
    [...code.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1]),
  );
  const missing = [...used].filter((v) => !defined.has(v));
  assert.deepEqual(missing, [], `undefined custom properties: ${missing}`);
});

test("package.json declares a valid TheLounge theme", () => {
  const t = pkg.thelounge;
  assert.ok(t, "missing thelounge field");
  assert.equal(t.type, "theme");
  assert.equal(t.css, "theme.min.css", "thelounge.css must point at the build output");
  assert.ok(t.name, "missing theme name");
  assert.match(t.themeColor, /^#[0-9a-f]{3,8}$/i, "themeColor must be a hex colour");
  assert.ok(
    pkg.files.includes("theme.min.css"),
    "theme.min.css must be in the published files",
  );
  assert.ok(pkg.keywords.includes("thelounge-theme"), "missing thelounge-theme keyword");
});

test("every color-mix() use is covered by the @supports not fallback block", () => {
  // Strip CSS comments first so commented-out examples don't skew counts.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");

  // Verify the fallback block exists.
  const supportsIdx = stripped.indexOf("@supports not (color-mix(");
  assert.ok(supportsIdx !== -1, "missing @supports not (color-mix()) fallback block");

  // Verify the fallback block body is non-empty (contains actual override rules).
  const blockOpen = stripped.indexOf("{", supportsIdx);
  const fallbackBody = stripped.slice(blockOpen + 1);
  assert.ok(
    fallbackBody.trim().length > 200,
    "@supports not fallback block appears empty — add override rules for each color-mix() use",
  );

  // Snapshot: if this count grows, add a corresponding fallback rule and update the number.
  const modernSection = stripped.slice(0, supportsIdx);
  const count = (modernSection.match(/color-mix\(/g) || []).length;
  assert.equal(
    count,
    17,
    `color-mix() use count changed (was 17, now ${count}) — add a fallback rule to the @supports not block and update this snapshot`,
  );
});

test("build output exists, is non-empty and smaller than source", () => {
  const min = join(root, "theme.min.css");
  assert.ok(existsSync(min), "theme.min.css not built — run `npm run build`");
  const minSize = statSync(min).size;
  const srcSize = statSync(join(root, "theme.css")).size;
  assert.ok(minSize > 0, "theme.min.css is empty");
  assert.ok(
    minSize < srcSize,
    `minified (${minSize}) should be smaller than source (${srcSize})`,
  );
});
