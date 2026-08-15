# Nudge

Nudge is a Chrome extension for setting gentler boundaries around browsing. It tracks active browsing time, shows a reminder when you reach a boundary, and gives you space to reflect without blocking the website.

You can set boundaries for individual websites, categories of sites, or all tracked browsing. The dashboard also includes daily activity, a calendar, custom site categories, reflections, and settings for data retention and appearance.

Nudge stores browsing hostnames, settings, and reflections locally in Chrome's extension storage.

## Development disclosure

Codex was used as a development tool while building Nudge. All planning, product decisions and UX / UI work were completed by a human.

## Requirements

To build Nudge from source, you will need:

- Google Chrome or another Chromium-based browser
- Node.js 20.19 or newer within the Node 20 release line, or Node.js 22.12 or newer
- npm, which is included with Node.js

## Install from source

Clone the repository and move into the extension directory:

Install the project dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

The finished extension will be written to `Extension/dist`.

## Add Nudge to Chrome

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** using the switch in the top-right corner.
3. Select **Load unpacked**.
4. Choose the `Extension/dist` folder created by the build command.
5. Nudge should now appear in your list of extensions. You can pin it from Chrome's Extensions menu for easier access.

Chrome opens the Nudge dashboard after the extension is installed. Follow the short setup flow to choose your browsing boundaries and daily reset time.

## Making changes

Run the Vite development server while working on the interface:

```bash
npm run dev
```

For testing the complete Chrome extension, create a fresh production build instead:

```bash
npm run build
```

Then return to `chrome://extensions` and select the reload button on the Nudge card. If Chrome no longer points to the build, use **Load unpacked** and select `Extension/dist` again.

## Project layout

- `Extension/src/background` contains activity tracking and extension state logic.
- `Extension/src/dashboard` contains onboarding, activity views, boundaries, site rules, and settings.
- `Extension/src/popup` contains the toolbar popup.
- `Extension/public` contains the manifest, icons, and page reminder script.
- `Extension/dist` is the generated Chrome extension and should not be edited directly.
- `Web` contains the standalone project website.Hosted [here](https://joshon360hz.github.io/NudgeWeb/) .


## Common problems

If `npm run build` reports that your Node.js version is unsupported, update Node.js and run `npm install` again.

If Chrome reports that the manifest is missing, make sure you selected `Extension/dist`, not the repository root or the `Extension` source folder.

If a code change does not appear in Chrome, rebuild the project and reload the extension from `chrome://extensions`. Changes to background code may also require refreshing any tabs that were already open.
