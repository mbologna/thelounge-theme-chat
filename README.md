# thelounge-theme-chat

[![npm version](https://img.shields.io/npm/v/thelounge-theme-chat.svg)](https://www.npmjs.com/package/thelounge-theme-chat)
[![CI](https://github.com/mbologna/thelounge-theme-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/mbologna/thelounge-theme-chat/actions/workflows/ci.yml)

thelounge-theme-chat is a theme for [The Lounge](https://thelounge.chat/), the
web IRC client, in warm stone tones with a blue accent. It follows the
operating system's light or dark setting, puts each sender's nick and time on
a line above the message, and meets WCAG AA contrast in both schemes. It is
plain CSS.

## Installation

```sh
thelounge install thelounge-theme-chat
```

Then pick **Chat** under Settings → Appearance → Theme. The theme supports
The Lounge 4.0 and later.

## What it looks like

- **Light and dark.** The scheme follows `prefers-color-scheme`; there is no
  toggle. Light mode uses an off-white background, dark mode a warm
  near-black.
- **Messages.** The nick, a coloured disc with a person silhouette and the
  time form a header line, with the text below. Consecutive messages from the
  same sender drop the header; their times appear on hover, and stay visible
  on touch screens, which have no hover.
- **Nick colours.** The Lounge gives each nick one of 32 colour classes. The
  theme has a darker set for light mode and a paler one for dark mode, each
  colour in the same hue family in both, and each at least 4.5:1 on every
  surface a nick appears on: the chat, the user list, the mentions popup, your
  own messages and highlighted messages, with or without hover.
- **Your own messages** carry an accent border on the left and a faint accent
  tint.
- **Mentions.** A message that mentions you gets a red border and tint, and
  your nick inside it becomes a red chip. In the sidebar the channel gets a red
  left border and a red badge that pulses three times; unread messages without
  a mention get a grey badge.
- **Markers.** The unread line and the date lines show their label in a pill
  on a thin rule.
- **Every surface.** Context menus, autocomplete, the mentions popup, link
  previews, condensed join and part lines, `/whois` replies, code blocks,
  dialogs, settings controls and the sign-in page all follow the palette, so
  dark mode has no white panels left over from the default theme.

## Accessibility

- Text meets WCAG AA contrast (4.5:1) in both schemes and with
  `prefers-contrast: more`, including nicks, the 16 classic mIRC colours and
  the colours The Lounge itself hardcodes for times, errors and badges. No
  text is faded with opacity. Form control borders (inputs, selects,
  checkboxes, radios), status dots and badges reach 3:1 (WCAG 1.4.11).
  `test/theme.test.mjs` computes the ratios from the CSS and fails the build
  when a pair falls short. axe-core reports no colour-contrast violations on
  The Lounge 4.5.2's views except text an IRC user sent with both a
  foreground and a background mIRC colour, which keeps the sender's pair, and
  the extended mIRC colours 16 to 98, which are drawn as The Lounge defines
  them (checked 2026-11-24).
- `prefers-reduced-motion: reduce` turns off animations and transitions.
- `prefers-contrast: more` strengthens borders and darkens or lightens the
  secondary text.
- `forced-colors: active` (Windows high contrast) maps the unread, active and
  mention states to system colours.
- Focus rings appear for keyboard focus (`:focus-visible`), not for mouse
  clicks.
- Touch screens get larger targets in the channel list and the user list, and
  16px inputs, so iOS Safari doesn't zoom on focus.
- Browsers without `color-mix()` (Chrome before 111, Firefox before 113,
  Safari before 16.2) get flat colours in its place.
- Printing hides the sidebar, the input and the buttons, prints black on
  white and shows every timestamp.

## Development

```sh
npm install         # dev tooling
npm run lint        # stylelint
npm run lint:fix    # stylelint --fix
npm run build       # minify theme.css to theme.min.css
npm test            # the test suite (builds first)
npm run check       # lint and test, as CI runs them
```

The tests (`test/theme.test.mjs`, Node's built-in runner, no extra
dependencies) check that the braces balance, that both schemes are present,
that all 32 nick colours exist in both, that the contrast ratios hold, that
the accessibility media queries exist, that every `var()` names a defined
token, that every `color-mix()` has a fallback, that the `thelounge` manifest
in `package.json` is valid and that the minified build exists.

### Testing a local build in The Lounge

Pack the theme and install the archive:

```sh
npm pack   # writes thelounge-theme-chat-<version>.tgz
thelounge install ./thelounge-theme-chat-<version>.tgz
```

Yarn, which `thelounge install` runs, caches packages by name and version. A
second archive with the same version but changed files hits the stale cache
entry, yarn skips the extraction, and The Lounge keeps serving the old CSS.
Either of these avoids it:

1. Pack under a throwaway version:
   `npm version prerelease --preid=local --no-git-tag-version` (`1.4.0` becomes
   `1.4.1-local.0`), then `npm pack`. Undo it after testing
   (`git checkout -- package.json package-lock.json`) and never commit it:
   only auto-release decides versions ([Versioning](#versioning)).
2. Clear the cache before reinstalling:

   ```sh
   yarn cache clean thelounge-theme-chat
   rm -rf ~/.cache/yarn/v6/npm-thelounge-theme-chat-*
   # if yarn add was run directly in the packages directory:
   rm -f /path/to/thelounge/packages/yarn.lock
   thelounge install ./thelounge-theme-chat-<version>.tgz
   ```

## Why not an existing tool

The Lounge bundles only its Default and Morning themes. This theme has its own
look, so there is nothing to replace it with. Checked 2026-11-23.

## Versioning

Releases follow SemVer: [auto-release](https://github.com/mbologna/auto-release)
tags `vX.Y.Z` from the [Conventional Commit](https://www.conventionalcommits.org/)
types on `main` (`feat` minor; `fix`, `perf`, `revert` patch; a breaking
change major) on Monday's scheduled CI run, or a manual run. Each tag
publishes the package to npm: `publish.yml` sets the version from the tag
(`npm version`). `version` in `package.json` is brought up to the latest
release by hand; the tag decides what is published. See the
[versioning standard](https://github.com/mbologna/.github/blob/main/VERSIONING.md).

## Related projects

- [thelounge-patched](https://github.com/mbologna/thelounge-patched): the
  official The Lounge image with fixes waiting to land upstream.
- [thelounge-plugin-apprise-push](https://github.com/mbologna/thelounge-plugin-apprise-push):
  push notifications for highlights and private messages through Apprise.
- [thelounge-digest](https://github.com/mbologna/thelounge-digest): a
  scheduled digest of selected channels, sent through Apprise.

## Licence

[MIT](LICENSE) © Michele Bologna
