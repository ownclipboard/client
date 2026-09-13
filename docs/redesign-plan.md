# OwnClipboard client redesign plan

Status: approved with defaults and implemented on branch `1-redesign` (September 2026). Client only; the API and every endpoint stay as they are.

Visual proposal (mockup, tokens, per-screen changes): https://claude.ai/code/artifact/10fc6dcf-4c29-4e86-ba89-b1a275b80392

## Goal

A face change of the Vue 3 client into a workspace-style app with light and dark themes, built on a small set of reusable primitives, while keeping every feature and API call unchanged.

## Visual identity

- Neutrals with a slight cool bias. Light: bg #f5f6f7, surface #ffffff, border #e2e5e9, fg #15191d, muted #5d6874. Dark: bg #0f1214, surface #15191c, border #252b31, fg #e7eaed, muted #98a2ad.
- Accent stays green for continuity, refined to emerald: #0f8a5f (light) / #3ccf97 (dark). Used only for selection, primary action and success.
- Semantic colors separate from the accent: amber (encrypted, pending), red (destructive), blue (files, info).
- Type: IBM Plex Sans for the interface, IBM Plex Mono for clip content. Self-hosted via @fontsource.
- Icons: Heroicons (already a dependency). Font Awesome CDN removed.

## Layout

- App shell: left sidebar (folders with counts and visibility glyphs, new folder, account links), top bar (current folder, search with `/`, Paste / New / Upload), main clip list.
- Sidebar replaces folder chips, the open-folder tab strip and the "Folder Settings" link. Folder settings open from a gear on the active folder row. `openTabs` state is dropped; `currentTab` remains.
- Mobile: sidebar becomes a drawer, actions become a sticky bottom bar.
- Clip row: type glyph, title, two-line monospace preview, meta. Two or three primary icon actions (Copy or Download, Preview) plus a menu (Edit, Move, Copy to, Hide, Delete). Always visible on touch.
- New clip opens an inline composer at the top of the list instead of swapping the paste board.
- All dialogs (password prompt, folder picker, upload, preview, storage CORS help, configure folder, payment) move to one Dialog primitive built on Headless UI.

## Screens

- Sign in: split layout, brand panel left, two-step form right (check-username, then login). Dev credentials come from env in dev only.
- Clipboard: as above, with per-folder empty states and skeleton rows.
- Pricing: status card (plan, expiry, pending invoice with cancel), Free and Pro yearly plan cards, comparison table. Monthly stays behind the existing flag. Debug JSON dump removed.
- Settings: Appearance (light / dark / system), Storage (owns3 status, connect, replace, disconnect), Account (username, plan, sign out).
- Public paste: focused logged-out page, large paste target, list of clips pasted from this browser.
- Loading and 404 states.

## Code changes

- `src/styles/tokens.css` with semantic CSS variables; Tailwind `darkMode: "class"` and color utilities mapped to the variables.
- Theme store: writes `dark` class on `<html>`, defaults to system, persists choice.
- `src/components/ui/`: Button (wraps LoadingButton to keep the `:click` / `stopLoading` contract), IconButton, Input, Textarea, Badge, Dialog, Menu, Tabs, Toast, EmptyState, Skeleton, Kbd, Tooltip.
- `src/layouts/AppShell.vue` replaces NavBar + AuthLayout markup; global dialogs mounted once.
- Debug plugin gated to dev.
- Keyboard: `/` search, `Esc` clear or close, `⌘V` paste into current folder, `n` new clip.
- Unchanged: stores, services, `http.ts`, crypto helpers, all endpoints.

## Phases

1. Foundation: tokens, Tailwind mapping, fonts, theme store, primitives, toast restyle, icon swap. Build and type check green.
2. Shell and sign in: AppShell, sidebar, mobile drawer, sign-in page, loading and 404 states.
3. Clipboard: top bar, search, clip rows and menus, composer, upload, preview, folder settings, folder picker, password prompt, storage help.
4. Pricing, Settings, Public paste.
5. Polish: empty states, skeletons, shortcuts, reduced motion, focus states, mobile pass, dead code and CDN removal.

One commit per phase on `1-redesign`. Verified in the browser against the live API in both themes.

## Decisions (defaults used unless changed)

1. Sidebar replaces folder chips and open tabs: yes.
2. Keep green accent, refined to emerald: yes.
3. Remove Font Awesome for Heroicons: yes.
4. Default theme follows the system, toggle in Settings and user menu: yes.
5. Clip actions as icon row plus menu: yes.
6. Sign-in stays two-step: yes.
