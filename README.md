---

# thelounge-theme-chat

A warm, editorial IRC theme for [TheLounge](https://thelounge.chat) with automatic light/dark switching.

## Features

- **Automatic light/dark mode** via `prefers-color-scheme`, no manual toggle needed
- **Digest-style messages**: nick · timestamp as a header line, content below; consecutive messages from the same sender collapse the header
- **Hover timestamps**: grouped messages show the timestamp on hover (top-right, Slack/Discord style) so the header stays clean
- **Coloured avatar discs**: Telegram-style person icon before each nick, coloured to match the nick's assigned colour (pure CSS, no JavaScript)
- **Two nick colour palettes**: dark saturated for light mode, soft pastels for dark mode
- **Own-message styling**: accent border + faint background tint instead of italic (emoji-safe)
- **Mention highlights**: pulsing red left-border on the channel row + orange-red badge with animated glow ring; unread uses a muted stone-gray pill badge
- **Unread marker pill**: rounded pill with a filled dot and tinted background instead of plain floating text
- **Active channel accent**: active channel gets an accent-tinted background and coloured name instead of a flat shade shift
- **Accessibility**: `prefers-reduced-motion` disables all animations/transitions; `:focus-visible` replaces `:focus` (no mouse-click rings); larger touch targets on coarse-pointer devices
- **Fully themed surfaces**: right-click context menus, autocomplete, mention popups, link previews, condensed join/part summaries, `/whois` cards and fenced code blocks all follow the palette in both modes (no stray white panels in dark mode)
- **Selection & code**: tinted text selection and warm syntax-friendly inline/block `code` colours

<!-- screenshot -->

## Installation

```sh
npm install -g thelounge
thelounge install thelounge-theme-chat
```

Or add it via TheLounge's web UI under **Settings → Packages**.

## Development

```sh
npm install
npm run lint        # check CSS
npm run lint:fix    # auto-fix
npm run build       # minify theme.css → theme.min.css
npm test            # run the theme test suite (builds first)
npm run check       # lint + test (what CI runs)
```

The test suite (`test/theme.test.mjs`, Node's built-in runner — no extra deps)
guards the theme's invariants: balanced CSS, automatic light/dark, all 32 nick
colours in both modes, accessibility media queries, every `var()` resolves to a
defined token, a valid `thelounge` manifest, and a successful minified build.

## License

MIT © Michele Bologna