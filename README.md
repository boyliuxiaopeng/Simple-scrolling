# Simple Scrolling

A lightweight userscript that adds a draggable floating scroll helper to web pages.

## Features

- Quick jump to the top, middle, or bottom of the page
- Draggable floating controls with saved position
- Auto show mode or always visible mode
- Custom light, dark, and settings button colors
- Keyboard shortcut support with `Ctrl + Up / Down`
- Follows system dark mode
- Respects reduced motion preferences

## Install

1. Install a userscript manager such as Tampermonkey.
2. Create a new script.
3. Paste the contents of [`Script.js`](./Script.js).
4. Save and open any page.

## Local Test

Open [`test.html`](./test.html) in a browser to manually verify scrolling, dragging, and settings behavior.

## Optimizations Included

- Fixed encoding-related text issues
- Reworked event binding to avoid duplicate listeners after settings changes
- Improved scroll height calculation for better page compatibility
- Added config parsing and numeric validation safeguards
- Added viewport clamping after drag and resize
- Cleaned up the demo page for easier regression checks

## License

MIT
