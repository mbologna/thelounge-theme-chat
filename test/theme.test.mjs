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

test("the mention badge sets its text colour (core's beats the plain badge's)", () => {
  const rule = code.match(/\.channel-list-item \.badge\.highlight\s*\{([^}]*)\}/);
  assert.ok(rule, "missing .channel-list-item .badge.highlight rule");
  assert.match(rule[1], /(^|[;\s])color:\s*var\(--c-on-accent\)/);
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

  // Verify the fallback block exists, and that its condition includes the
  // `color:` property. A bare `@supports not (color-mix(...))` (no property)
  // is invalid feature-query grammar and evaluates to true unconditionally —
  // i.e. the "legacy fallback" block would silently win in every modern
  // browser instead of only in ones that actually lack color-mix() support.
  assert.doesNotMatch(
    stripped,
    /@supports\s+not\s+\(\s*color-mix\(/,
    "malformed @supports condition: bare `(color-mix(...))` has no `property:` " +
      "prefix, so `not (...)` evaluates to true even where color-mix() is supported",
  );
  const supportsIdx = stripped.indexOf("@supports not (color: color-mix(");
  assert.ok(supportsIdx !== -1, "missing @supports not (color: color-mix()) fallback block");

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
    22,
    `color-mix() use count changed (was 22, now ${count}) — add a fallback rule to the @supports not block and update this snapshot`,
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

// ── Contrast (WCAG 2.x) ──────────────────────────────────────────────────────

/** The body of the `{…}` block that opens at or after `from`. */
function blockAt(text, from) {
  const open = text.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error(`unclosed block at ${from}`);
}

/** { name: value } of the custom properties declared directly in a block. */
function tokens(body) {
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1], m[2].trim()]),
  );
}

/** [r, g, b, alpha] from #rgb, #rrggbb or rgb(r g b / a%). */
function parseColor(value) {
  let m = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1);
  }
  m = value.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)%\s*\)$/);
  if (m) return [+m[1], +m[2], +m[3], +m[4] / 100];
  throw new Error(`unsupported colour: ${value}`);
}

/** `top` at fraction `p` over the opaque `base`, as color-mix() or alpha does. */
function over(top, base, p = top[3]) {
  return [0, 1, 2].map((i) => top[i] * p + base[i] * (1 - p)).concat(1);
}

function luminance([r, g, b]) {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const lightTokens = tokens(blockAt(code, code.search(/^:root\s*\{/m)));
const darkStart = code.search(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{/);
const darkTokens = {
  ...lightTokens,
  ...tokens(blockAt(code, code.indexOf(":root", darkStart))),
};

const nickColours = (indent) =>
  [...code.matchAll(new RegExp(`^${indent}\\.user\\.color-(\\d+)\\s*\\{\\s*color:\\s*(#[0-9a-f]{6})`, "gim"))]
    .map((m) => [+m[1], parseColor(m[2])]);

/** Every background a message, a nick or secondary text is drawn on. */
function messageSurfaces(t) {
  const c = (name) => parseColor(t[`c-${name}`]);
  return {
    bg: c("bg"),
    panel: c("panel"),
    elevated: c("elevated"),
    hover: c("hover"),
    // Own messages: color-mix(accent 8%, transparent), 12% on hover
    "own message": over(c("accent"), c("bg"), 0.08),
    "own message hover": over(c("accent"), c("bg"), 0.12),
    "highlighted row": over(parseColor(t["c-hl-bg"]), c("bg")),
    "highlighted row hover": over(parseColor(t["c-hl-bg-hover"]), c("bg")),
  };
}

for (const [scheme, t, nicks] of [
  ["light", lightTokens, nickColours("")],
  ["dark", darkTokens, nickColours(" +")],
]) {
  test(`${scheme} mode: text and fills meet WCAG AA`, () => {
    const c = (name) => parseColor(t[`c-${name}`]);
    const surfaces = messageSurfaces(t);
    const highlightRow = surfaces["highlighted row"];
    // [label, foreground, background, minimum ratio]
    const pairs = [];
    for (const text of ["text", "soft", "muted", "accent"]) {
      for (const [name, surface] of Object.entries(surfaces)) {
        pairs.push([`${text} on ${name}`, c(text), surface, 4.5]);
      }
    }
    for (const fill of ["accent", "accent-strong", "unread", "unread-muted", "danger", "danger-strong"]) {
      pairs.push([`on-accent on ${fill}`, c("on-accent"), c(fill), 4.5]);
    }
    for (const text of ["notice", "action"]) {
      for (const name of ["bg", "own message", "highlighted row"]) {
        pairs.push([`${text} on ${name}`, c(text), surfaces[name], 4.5]);
      }
    }
    pairs.push(
      // Active channel row and its hover: color-mix(accent 10%/14%, panel)
      ["accent on active channel", c("accent"), over(c("accent"), c("panel"), 0.1), 4.5],
      ["accent on active hover", c("accent"), over(c("accent"), c("panel"), 0.14), 4.5],
      // Mention chip: color-mix(unread 14%) over a highlighted row
      ["unread on mention chip", c("unread"), over(c("unread"), highlightRow, 0.14), 4.5],
      ["unread on bg (unread marker)", c("unread"), c("bg"), 4.5],
      ["text on highlighted row", c("text"), highlightRow, 4.5],
      ["soft on own message", c("soft"), over(c("accent"), c("bg"), 0.12), 4.5],
      ["warn on panel (not-secure)", c("warn"), c("panel"), 4.5],
      ["danger on panel (not-connected)", c("danger"), c("panel"), 4.5],
      ["success on bg", c("success"), c("bg"), 4.5],
      ["code on elevated", c("code"), c("elevated"), 4.5],
      // Non-text: status dots and badges against the sidebar (WCAG 1.4.11)
      ["online dot on panel", c("online"), c("panel"), 3],
      ["away dot on panel", c("away"), c("panel"), 3],
      ["unread badge on panel", c("unread"), c("panel"), 3],
      ["unread-muted badge on panel", c("unread-muted"), c("panel"), 3],
    );
    const failing = pairs
      .map(([label, fg, bg, min]) => [label, contrast(fg, bg), min])
      .filter(([, ratio, min]) => ratio < min)
      .map(([label, ratio, min]) => `${label}: ${ratio.toFixed(2)} < ${min}`);
    assert.deepEqual(failing, [], `contrast below WCAG AA:\n${failing.join("\n")}`);
  });

  test(`${scheme} mode: every nick colour is readable wherever nicks appear`, () => {
    assert.equal(nicks.length, 32, `expected 32 ${scheme} nick colours, found ${nicks.length}`);
    const failing = [];
    for (const [n, colour] of nicks) {
      for (const [name, surface] of Object.entries(messageSurfaces(t))) {
        const ratio = contrast(colour, surface);
        if (ratio < 4.5) failing.push(`color-${n} on ${name}: ${ratio.toFixed(2)}`);
      }
    }
    assert.deepEqual(failing, [], `nick colours below 4.5:1:\n${failing.join("\n")}`);
  });
}

test("no partial opacity on text: fading lowers contrast below the tested ratios", () => {
  const offending = [...code.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    // Pseudo-elements are graphics here (the avatar disc), not text
    .filter(([, selector]) => /\.(user|time|content|name|text)\b/.test(selector) && !/::(before|after)/.test(selector))
    .filter(([, , body]) => [...body.matchAll(/(?:^|;|\s)opacity:\s*([\d.]+)/g)].some((m) => +m[1] > 0 && +m[1] < 1))
    .map(([, selector]) => selector.trim().replace(/\s+/g, " "));
  assert.deepEqual(offending, [], `text faded with opacity:\n${offending.join("\n")}`);
});

const moreBody = blockAt(code, code.search(/@media\s*\(prefers-contrast:\s*more\)\s*\{/));
const moreLight = { ...lightTokens, ...tokens(blockAt(moreBody, moreBody.search(/:root\s*\{/))) };
const moreDarkStart = moreBody.search(/@media\s*\(prefers-color-scheme:\s*dark\)/);
const moreDark = { ...darkTokens, ...tokens(blockAt(moreBody, moreBody.indexOf(":root", moreDarkStart))) };

for (const [scheme, base, more] of [
  ["light", lightTokens, moreLight],
  ["dark", darkTokens, moreDark],
]) {
  test(`${scheme} mode: form control borders are 3:1 on every surface (WCAG 1.4.11)`, () => {
    const failing = [];
    for (const [label, t] of [["default", base], ["prefers-contrast: more", more]]) {
      const border = parseColor(t["c-border-ui"]);
      for (const name of ["bg", "panel", "elevated", "hover"]) {
        const ratio = contrast(border, parseColor(t[`c-${name}`]));
        if (ratio < 3) failing.push(`${label}: border-ui on ${name}: ${ratio.toFixed(2)}`);
      }
      for (const dot of ["online", "away", "offline"]) {
        const ratio = contrast(parseColor(t[`c-${dot}`]), parseColor(t["c-panel"]));
        if (ratio < 3) failing.push(`${label}: ${dot} dot on panel: ${ratio.toFixed(2)}`);
      }
    }
    assert.deepEqual(failing, [], failing.join("\n"));
  });

  test(`${scheme} mode: prefers-contrast: more is never weaker than the default`, () => {
    const weaker = [];
    for (const name of ["soft", "muted", "border-ui"]) {
      for (const surface of ["bg", "elevated"]) {
        const bg = parseColor(base[`c-${surface}`]);
        const before = contrast(parseColor(base[`c-${name}`]), bg);
        const after = contrast(parseColor(more[`c-${name}`]), bg);
        if (after < before) weaker.push(`${name} on ${surface}: ${after.toFixed(2)} < ${before.toFixed(2)}`);
      }
    }
    assert.deepEqual(weaker, [], weaker.join("\n"));
  });
}

const ircColours = (indent) =>
  [...code.matchAll(new RegExp(`^${indent}#chat \\.content \\.irc-fg(\\d+):not\\(\\[class\\*="irc-bg"\\]\\)\\s*\\{\\s*color:\\s*(#[0-9a-f]{3,6})`, "gim"))]
    .map((m) => [+m[1], parseColor(m[2])]);

for (const [scheme, t, colours] of [
  ["light", lightTokens, ircColours("")],
  ["dark", darkTokens, ircColours(" +")],
]) {
  test(`${scheme} mode: the 16 mIRC colours are readable on message surfaces`, () => {
    assert.deepEqual(colours.map(([n]) => n), [...Array(16).keys()], "expected .irc-fg0 to .irc-fg15");
    const failing = [];
    for (const [n, colour] of colours) {
      for (const [name, surface] of Object.entries(messageSurfaces(t))) {
        const ratio = contrast(colour, surface);
        if (ratio < 4.5) failing.push(`irc-fg${n} on ${name}: ${ratio.toFixed(2)}`);
      }
    }
    assert.deepEqual(failing, [], failing.join("\n"));
  });
}
