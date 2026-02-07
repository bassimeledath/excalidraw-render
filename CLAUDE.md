# Excalidraw MCP Server (Headless PNG)

MCP server that renders Excalidraw diagrams as PNG files via headless Chromium. Designed for Claude Code CLI (no browser UI required).

## Architecture

```
server.ts      → 2 tools (read_me, create_diagram) + cheat sheet
renderer.ts    → Headless browser singleton (agent-browser/Playwright) + embedded Excalidraw init
main.ts        → stdio transport entry point
```

## Tools

### `read_me` (text tool)
Returns a cheat sheet with element format, color palettes, coordinate tips, and examples. Call before `create_diagram`.

### `create_diagram` (PNG render tool)
Takes `elements` (JSON string) and optional `outputPath`. Renders the diagram in headless Chromium and returns the PNG file path.

## Setup

```bash
npm install
npm run setup    # Downloads Chromium via agent-browser
npm run build
```

## Running

```bash
# stdio (for Claude Code CLI)
node dist/index.js
```

## Claude Code config

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "excalidraw": {
      "command": "node",
      "args": ["/absolute/path/to/excalidraw-mcp-app/dist/index.js"]
    }
  }
}
```

## Build

```bash
npm run build
```

Build pipeline: `tsc -p tsconfig.server.json` → `bun build` (server + renderer + index).

## Key Design Decisions

### Headless PNG rendering (no UI surface)
Claude Code CLI has no browser rendering surface. Instead of `ui://` resources, we render diagrams server-side in headless Chromium and save as PNG files.

### Browser singleton
The headless browser is lazily initialized on first `create_diagram` call and reused for subsequent renders. Health checks detect crashes and re-launch automatically.

### Excalidraw from CDN
The headless browser dynamically imports Excalidraw from `esm.sh` CDN at initialization time — no npm dependency needed server-side. The browser navigates to esm.sh first so that Excalidraw's relative module imports resolve correctly.

### Viewport via cameraUpdate
The last `cameraUpdate` element determines the output PNG viewport/dimensions. The SVG `viewBox` is set to crop to the camera's scene-space rectangle.

## Debugging

### Common issues
- **Browser launch fails:** Run `npm run setup` to install Chromium
- **Render times out:** Check internet access to esm.sh — the headless browser loads Excalidraw from CDN
- **Font is default (not hand-drawn):** Virgil font is inlined by exportToSvg; ensure Excalidraw loaded correctly
- **Empty PNG:** Elements array had no drawable elements (only cameraUpdates)
