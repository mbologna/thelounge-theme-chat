# thelounge-theme-chat

[![npm version](https://img.shields.io/npm/v/thelounge-theme-chat.svg)](https://www.npmjs.com/package/thelounge-theme-chat)
[![CI](https://github.com/mbologna/thelounge-theme-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/mbologna/thelounge-theme-chat/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/thelounge-theme-chat.svg)](https://www.npmjs.com/package/thelounge-theme-chat)
[![license](https://img.shields.io/npm/l/thelounge-theme-chat.svg)](LICENSE)

A warm, editorial IRC theme for [TheLounge](https://thelounge.chat/) with automatic
light/dark switching, digest-style messages, and coloured avatar discs. Pure CSS, no
JavaScript.

---

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Development](#development)
- [Related](#related)
- [License](#license)

---

## Features

- **Automatic light/dark mode** via `prefers-color-scheme`, no manual toggle needed
- **Digest-style messages**: nick · timestamp as a header line, content below; consecutive
  messages from the same sender collapse the header
- **Hover timestamps**: grouped messages show the timestamp on hover (top-right,
  Slack/Discord style) so the header stays clean
- **Coloured avatar discs**: Telegram-style person icon before each nick, coloured to match
  the nick's assigned colour (pure CSS, no JavaScript)
- **Two nick colour palettes**: dark saturated for light mode, soft pastels for dark mode
- **Own-message styling**: accent border + faint background tint instead of italic
  (emoji-safe)
- **Mention highlights**: pulsing red left-border on the channel row + orange-red badge with
  animated glow ring; unread uses a muted stone-gray pill badge
- **Unread marker pill**: rounded pill with a filled dot and tinted background instead of
  plain floating text
- **Active channel accent**: active channel gets an accent-tinted background and coloured
  name instead of a flat shade shift
- **Accessibility**: `prefers-reduced-motion` disables all animations/transitions;
  `:focus-visible` replaces `:focus` (no mouse-click rings); larger touch targets on
  coarse-pointer devices
- **Fully themed surfaces**: right-click context menus, autocomplete, mention popups, link
  previews, condensed join/part summaries, `/whois` cards and fenced code blocks all follow
  the palette in both modes (no stray white panels in dark mode)
- **Selection & code**: tinted text selection and warm syntax-friendly inline/block `code`
  colours

---

## Installation

```sh
npm install -g thelounge
thelounge install thelounge-theme-chat
```

Or add it via TheLounge's web UI under **Settings → Packages**.

---

## Development

```sh
npm install         # install dev tooling
npm run lint        # check CSS (stylelint)
npm run lint:fix    # auto-fix
npm run build       # minify theme.css → theme.min.css
npm test            # run the theme test suite (builds first)
npm run check       # lint + test (what CI runs)
```

The test suite (`test/theme.test.mjs`, Node's built-in runner with no extra deps) guards the
theme's invariants: balanced CSS, automatic light/dark, all 32 nick colours in both modes,
accessibility media queries, every `var()` resolves to a defined token, a valid `thelounge`
manifest, and a successful minified build.

### Testing a local build in a running TheLounge instance

After `npm run build`, install the local package with `thelounge install` (or `yarn add` in
TheLounge's packages directory):

```sh
npm pack   # produces thelounge-theme-chat-<version>.tgz
thelounge install ./thelounge-theme-chat-<version>.tgz
```

**Yarn cache trap — same version, changed files:** yarn caches packages by content hash. If
you repack the same version number, the new tgz gets a different hash but yarn finds a stale
cache entry from the previous install and silently skips extraction, serving the old CSS.

Two workarounds:

1. **Bump the patch version** before repacking (`1.3.0` → `1.3.1`). Yarn's cache key
   includes the version, so a new version always forces a fresh extract.

2. **Clear the cache manually** before reinstalling (no version bump needed):

   ```sh
   yarn cache clean thelounge-theme-chat
   rm -rf ~/.cache/yarn/v6/npm-thelounge-theme-chat-*
   # also wipe the lockfile if yarn add is used directly in the packages dir:
   rm -f /path/to/thelounge/packages/yarn.lock
   thelounge install ./thelounge-theme-chat-<version>.tgz
   ```

---

## Related

See also:

- 🔔 **[thelounge-plugin-apprise-push](https://github.com/mbologna/thelounge-plugin-apprise-push)**: push notifications via Apprise (100+ services, hot-reload config, zero deps)

---

## License

[MIT](LICENSE) © Michele Bologna
