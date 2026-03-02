import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import { renderToPng, renderToSvg } from "./renderer.js";

// ============================================================
// RECALL: shared knowledge for the agent
// ============================================================
const RECALL_CHEAT_SHEET = `# Excalidraw Element Format

Thanks for calling excalidraw_read_me! Do NOT call it again in this conversation — you will not see anything new. Now use create_excalidraw_diagram to draw.

## Color Palette (use consistently across all tools)

### Primary Colors
| Name | Hex | Use |
|------|-----|-----|
| Blue | \`#4a9eed\` | Primary actions, links, data series 1 |
| Amber | \`#f59e0b\` | Warnings, highlights, data series 2 |
| Green | \`#22c55e\` | Success, positive, data series 3 |
| Red | \`#ef4444\` | Errors, negative, data series 4 |
| Purple | \`#8b5cf6\` | Accents, special items, data series 5 |
| Pink | \`#ec4899\` | Decorative, data series 6 |
| Cyan | \`#06b6d4\` | Info, secondary, data series 7 |
| Lime | \`#84cc16\` | Extra, data series 8 |

### Excalidraw Fills (pastel, for shape backgrounds)
| Color | Hex | Good For |
|-------|-----|----------|
| Light Blue | \`#a5d8ff\` | Input, sources, primary nodes |
| Light Green | \`#b2f2bb\` | Success, output, completed |
| Light Orange | \`#ffd8a8\` | Warning, pending, external |
| Light Purple | \`#d0bfff\` | Processing, middleware, special |
| Light Red | \`#ffc9c9\` | Error, critical, alerts |
| Light Yellow | \`#fff3bf\` | Notes, decisions, planning |
| Light Teal | \`#c3fae8\` | Storage, data, memory |
| Light Pink | \`#eebefa\` | Analytics, metrics |

### Background Zones (use with opacity: 30 for layered diagrams)
| Color | Hex | Good For |
|-------|-----|----------|
| Blue zone | \`#dbe4ff\` | UI / frontend layer |
| Purple zone | \`#e5dbff\` | Logic / agent layer |
| Green zone | \`#d3f9d8\` | Data / tool layer |

---

## Excalidraw Elements

### Required Fields (all elements)
\`type\`, \`id\` (unique string), \`x\`, \`y\`, \`width\`, \`height\`

### Defaults (skip these)
strokeColor="#1e1e1e", backgroundColor="transparent", fillStyle="solid", strokeWidth=2, strokeStyle="solid", roughness=1, opacity=100
Canvas background is white.
- \`strokeStyle\`: "solid" (default) | "dashed" | "dotted" — use dashed for async messages, lifelines, FK relationships; dotted for optional/weak connections
- \`opacity\`: 0-100 (default 100) — works on ALL element types. Use 30-40 for background zones, 50 for de-emphasized elements

### Element Types

**Rectangle**: \`{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 100 }\`
- \`roundness: { type: 3 }\` for rounded corners
- \`backgroundColor: "#a5d8ff"\`, \`fillStyle: "solid"\` for filled

**Ellipse**: \`{ "type": "ellipse", "id": "e1", "x": 100, "y": 100, "width": 150, "height": 150 }\`

**Diamond**: \`{ "type": "diamond", "id": "d1", "x": 100, "y": 100, "width": 150, "height": 150 }\`
- Diamond labels have ~40% less horizontal space than the diamond width (text is inscribed)
- Use width 180+ for 2-word labels, 220+ for 3+ words, or abbreviate
- Keep labels short: "In Stock?" not "Is the item in stock?"

**Labeled shape (PREFERRED)**: Add \`label\` to any shape for auto-centered text. No separate text element needed.
\`{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 80, "label": { "text": "Hello", "fontSize": 20 } }\`
- Works on rectangle, ellipse, diamond
- Text auto-centers and container auto-resizes to fit
- Saves tokens vs separate text elements
- Multi-line labels: use \`\\n\` in label text for line breaks
- Auto-resize: when label text exceeds the manually set width/height, the container grows to fit. For multi-line labels with long lines, set width to 280+ or keep all lines under ~15 characters to avoid unexpected growth
- Zone labels: don't use the zone rectangle's own \`label\` (it centers in the middle). Instead use a separate standalone text element near the top-left of the zone rectangle

**Labeled arrow**: \`"label": { "text": "connects" }\` on an arrow element.

**Title (PREFERRED for headings)**: Use a transparent rectangle spanning the diagram width with a subtle bottom border. The label auto-centers perfectly — no math needed.
\`{ "type": "rectangle", "id": "title", "x": DIAGRAM_LEFT, "y": TOP, "width": DIAGRAM_WIDTH, "height": 40, "strokeColor": "#e0e0e0", "backgroundColor": "transparent", "strokeWidth": 1, "label": { "text": "My Title", "fontSize": 28 } }\`
For subtitle: same pattern with height: 30, fontSize: 16, strokeColor: "#b0b0b0".

**Standalone text** (annotations, zone labels — NOT for titles):
\`{ "type": "text", "id": "t1", "x": 150, "y": 138, "text": "Hello", "fontSize": 20 }\`
- x is the LEFT edge of the text
- Use for zone labels (top-left of zone rectangle) and small annotations
- Do NOT use for titles or headings — centering is unreliable. Use a transparent labeled rectangle instead

**Line**: Same as arrow but \`type: "line"\`. No arrowheads. Use for decorative lines, borders, and closed shapes (set last point = [0,0] to close the path).

**Image**: \`{ "type": "image", "id": "i1", "fileId": "img1", "x": 100, "y": 100, "width": 200, "height": 150 }\`
- Requires passing a \`files\` parameter to create_excalidraw_diagram with the image data
- Files format: \`{ "img1": { "mimeType": "image/png", "dataURL": "data:image/png;base64,..." } }\`
- Supported formats: PNG, JPEG, SVG, GIF

**Image with files parameter — complete example:**
\`\`\`
elements: [
  { "type": "cameraUpdate", "width": 400, "height": 300, "x": 0, "y": 0 },
  { "type": "image", "id": "i1", "fileId": "logo", "x": 100, "y": 80, "width": 200, "height": 140 }
]
files: { "logo": { "mimeType": "image/png", "dataURL": "data:image/png;base64,iVBOR..." } }
\`\`\`
Every image element's \`fileId\` must have a matching key in the \`files\` map — missing fileIds will error.

**Arrow**: \`{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0, "points": [[0,0],[200,0]], "endArrowhead": "arrow" }\`
- points: [dx, dy] offsets from element x,y
- endArrowhead: null | "arrow" | "bar" | "dot" | "triangle"
- startArrowhead: same options — use for bidirectional arrows (e.g., WebSocket, sync)
- Common arrowhead combos: 1:1 = bar→bar, 1:N = bar→arrow, N:M = arrow→arrow, composition = dot→arrow

### Arrow Bindings (IMPORTANT — read carefully)
Arrow: \`"startBinding": { "elementId": "r1", "fixedPoint": [1, 0.5] }\`
fixedPoint: top=[0.5,0], bottom=[0.5,1], left=[0,0.5], right=[1,0.5]

**⚠ Bindings do NOT auto-route.** The \`points\` array defines the actual rendered path — bindings only create a logical association. Your arrow's \`points\` must physically reach from the start element to the end element. If \`points: [[0,0],[150,0]]\` only goes 150px right, but the target is 400px away, the arrow will end in empty space.

**⚠ Arrow x,y must be near the start element's edge.** Set the arrow's \`x, y\` to approximately the edge where \`startBinding.fixedPoint\` points. A far-off origin causes misalignment.

**Connecting two shapes checklist:**
1. Set arrow \`x, y\` to the start shape's edge (e.g., right edge = shape.x + shape.width, y = shape.y + shape.height/2)
2. Calculate dx, dy to the target shape's edge
3. Set \`points: [[0,0],[dx, dy]]\` for straight lines, or \`[[0,0],[dx,0],[dx,dy]]\` for right-angle routing
4. Set \`startBinding\` and \`endBinding\` with appropriate \`fixedPoint\` values

### Multi-Segment Arrows (for routing around obstacles)
Use 3+ points in the \`points\` array to create right-angle paths:

**L-shape (go right, then down):**
\`"points": [[0,0],[200,0],[200,150]]\` — horizontal then vertical

**Z-shape (go right, down, then right again):**
\`"points": [[0,0],[100,0],[100,150],[300,150]]\` — step pattern

**U-shape (go down, right, then up):**
\`"points": [[0,0],[0,100],[250,100],[250,-50]]\` — route around an obstacle

Set \`width\` and \`height\` to the bounding box of your points array (max dx, max dy).

**Labels on multi-segment arrows** render at the geometric midpoint of the point sequence — this often falls on a bend or overlap zone. For complex paths (self-calls, U-shapes), use a nearby standalone text element instead of an arrow label.

Example — right-angle arrow from shape A (right edge at x:300,y:150) to shape B (left edge at x:500,y:400):
\`\`\`json
{
  "type": "arrow", "id": "a1", "x": 300, "y": 150,
  "width": 200, "height": 250,
  "points": [[0,0],[100,0],[100,250],[200,250]],
  "endArrowhead": "arrow",
  "startBinding": { "elementId": "A", "fixedPoint": [1, 0.5] },
  "endBinding": { "elementId": "B", "fixedPoint": [0, 0.5] }
}
\`\`\`

### Drawing Order
- Array order = z-order (first = back, last = front)
- Draw background zones first, then shapes with labels, then arrows
- GOOD: bg_shape → shape1 → arrow1 → shape2 → arrow2 → ...

### Spatial Layout Rules (CRITICAL for readable diagrams)

**NEVER route arrows through shapes.** Arrows must go AROUND shapes, not through them.
- Before placing an arrow, check if its straight-line path crosses any shape
- If it does, use a multi-segment arrow (L-shape, Z-shape, or U-shape) to route around the obstacle
- Leave at least 30px clearance between arrow paths and shape edges

**Plan spatial layout BEFORE placing elements:**
1. Sketch a mental grid — place connected elements adjacent to each other
2. Keep relationship elements (diamonds, labels) on the direct path between their connected shapes
3. Group related elements in spatial clusters, not scattered across the canvas
4. Leave wide corridors (80-100px) between element groups for arrow routing

**Arrow clearance rules:**
- Minimum 30px gap between an arrow path and any shape it passes near
- Minimum 40px between parallel arrows
- Arrow labels need 60px+ clear space around them (no overlapping shapes or other arrows)
- If an arrow must cross another arrow, cross at 90° angles (perpendicular), never at shallow angles

**Dense diagrams (8+ elements):**
- Use a grid or column layout — don't scatter elements randomly
- Dedicate empty lanes/corridors specifically for arrow routing
- Consider breaking into sub-diagrams if arrows become unmanageable

### Example: Two connected labeled boxes
\`\`\`json
[
  { "type": "cameraUpdate", "width": 800, "height": 600, "x": 50, "y": 50 },
  { "type": "rectangle", "id": "b1", "x": 100, "y": 100, "width": 200, "height": 100, "roundness": { "type": 3 }, "backgroundColor": "#a5d8ff", "fillStyle": "solid", "label": { "text": "Start", "fontSize": 20 } },
  { "type": "rectangle", "id": "b2", "x": 450, "y": 100, "width": 200, "height": 100, "roundness": { "type": 3 }, "backgroundColor": "#b2f2bb", "fillStyle": "solid", "label": { "text": "End", "fontSize": 20 } },
  { "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 150, "height": 0, "points": [[0,0],[150,0]], "endArrowhead": "arrow", "startBinding": { "elementId": "b1", "fixedPoint": [1, 0.5] }, "endBinding": { "elementId": "b2", "fixedPoint": [0, 0.5] } }
]
\`\`\`

### Camera & Sizing (CRITICAL for readability)

Use a cameraUpdate as the first element to set the output PNG dimensions. Only the last cameraUpdate determines the final viewport.

**Recommended camera sizes (4:3 aspect ratio ONLY):**
- Camera **S**: width 400, height 300 — close-up on a small group (2-3 elements)
- Camera **M**: width 600, height 450 — medium view, a section of a diagram
- Camera **L**: width 800, height 600 — standard full diagram (DEFAULT)
- Camera **XL**: width 1200, height 900 — large diagram overview. WARNING: font size smaller than 18 is unreadable
- Camera **XXL**: width 1600, height 1200 — panorama / final overview of complex diagrams. WARNING: minimum readable font size is 21

ALWAYS use one of these exact sizes. Non-4:3 viewports cause distortion.

**Font size rules (scaled by camera size):**

| Camera | Shape labels | Arrow labels | Titles | Annotations |
|--------|-------------|--------------|--------|-------------|
| S/M    | 16+         | 14+          | 20+    | 14+         |
| L      | 16+         | 16+          | 20+    | 14+         |
| XL     | 18+         | 18+          | 24+    | 16+         |
| XXL    | 20+         | 18+          | 28+    | 18+         |

- NEVER use fontSize below 14 for any camera size
- Arrow labels should be short (1-3 words) since they render at the arrow midpoint with no offset control
- Labeled arrows need minimum 150px length — shorter arrows cause labels to overlap arrowheads

**Element sizing rules:**
- Minimum shape size: 120×60 for labeled rectangles/ellipses
- Unlabeled decorative shapes (activation boxes, dividers, spacers) can be any size — the 120×60 minimum only applies to shapes with labels
- Leave 20-30px gaps between elements minimum
- Prefer fewer, larger elements over many tiny ones

ALWAYS start with a \`cameraUpdate\` as the FIRST element:
\`{ "type": "cameraUpdate", "width": 800, "height": 600, "x": 0, "y": 0 }\`

- x, y: top-left corner of visible area (scene coordinates)
- Leave padding: don't match camera size to content size exactly (e.g., 500px content in 800x600 camera)
- After placing all elements, verify the rightmost/bottommost elements have 40px+ padding from the camera edge. Edge clipping is the #2 most common layout error

Examples:
\`{ "type": "cameraUpdate", "width": 800, "height": 600, "x": 0, "y": 0 }\` — standard view
\`{ "type": "cameraUpdate", "width": 400, "height": 300, "x": 200, "y": 100 }\` — zoom into a detail
\`{ "type": "cameraUpdate", "width": 1600, "height": 1200, "x": -50, "y": -50 }\` — panorama overview

## Diagram Example

Example prompt: "Explain how photosynthesis works"

\`\`\`json
[
  {"type":"cameraUpdate","width":800,"height":600,"x":0,"y":-20},
  {"type":"rectangle","id":"ti","x":0,"y":-10,"width":800,"height":40,"strokeColor":"#e0e0e0","backgroundColor":"transparent","strokeWidth":1,"label":{"text":"Photosynthesis","fontSize":28}},
  {"type":"rectangle","id":"fo","x":0,"y":30,"width":800,"height":30,"strokeColor":"transparent","backgroundColor":"transparent","strokeWidth":0,"label":{"text":"6CO2 + 6H2O --> C6H12O6 + 6O2","fontSize":16,"strokeColor":"#b0b0b0"}},
  {"type":"rectangle","id":"lf","x":150,"y":90,"width":520,"height":380,"backgroundColor":"#d3f9d8","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#22c55e","strokeWidth":1,"opacity":35},
  {"type":"text","id":"lfl","x":170,"y":96,"text":"Inside the Leaf","fontSize":16,"strokeColor":"#22c55e"},
  {"type":"rectangle","id":"lr","x":190,"y":190,"width":160,"height":70,"backgroundColor":"#fff3bf","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#f59e0b","label":{"text":"Light Reactions","fontSize":16}},
  {"type":"arrow","id":"a1","x":350,"y":225,"width":120,"height":0,"points":[[0,0],[120,0]],"strokeColor":"#1e1e1e","strokeWidth":2,"endArrowhead":"arrow","label":{"text":"ATP","fontSize":14}},
  {"type":"rectangle","id":"cc","x":470,"y":190,"width":160,"height":70,"backgroundColor":"#d0bfff","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#8b5cf6","label":{"text":"Calvin Cycle","fontSize":16}},
  {"type":"rectangle","id":"sl","x":10,"y":200,"width":120,"height":50,"backgroundColor":"#fff3bf","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#f59e0b","label":{"text":"Sunlight","fontSize":16}},
  {"type":"arrow","id":"a2","x":130,"y":225,"width":60,"height":0,"points":[[0,0],[60,0]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":"arrow"},
  {"type":"rectangle","id":"wa","x":200,"y":360,"width":140,"height":50,"backgroundColor":"#a5d8ff","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#4a9eed","label":{"text":"Water (H2O)","fontSize":16}},
  {"type":"arrow","id":"a3","x":270,"y":360,"width":0,"height":-100,"points":[[0,0],[0,-100]],"strokeColor":"#4a9eed","strokeWidth":2,"endArrowhead":"arrow"},
  {"type":"rectangle","id":"co","x":480,"y":360,"width":130,"height":50,"backgroundColor":"#ffd8a8","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#f59e0b","label":{"text":"CO2","fontSize":16}},
  {"type":"arrow","id":"a4","x":545,"y":360,"width":0,"height":-100,"points":[[0,0],[0,-100]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":"arrow"},
  {"type":"rectangle","id":"ox","x":540,"y":100,"width":100,"height":40,"backgroundColor":"#ffc9c9","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#ef4444","label":{"text":"O2","fontSize":16}},
  {"type":"arrow","id":"a5","x":310,"y":190,"width":230,"height":-50,"points":[[0,0],[230,-50]],"strokeColor":"#ef4444","strokeWidth":2,"endArrowhead":"arrow"},
  {"type":"rectangle","id":"gl","x":690,"y":195,"width":120,"height":60,"backgroundColor":"#c3fae8","fillStyle":"solid","roundness":{"type":3},"strokeColor":"#22c55e","label":{"text":"Glucose","fontSize":18}},
  {"type":"arrow","id":"a6","x":630,"y":225,"width":60,"height":0,"points":[[0,0],[60,0]],"strokeColor":"#22c55e","strokeWidth":2,"endArrowhead":"arrow"},
  {"type":"ellipse","id":"sun","x":30,"y":110,"width":50,"height":50,"backgroundColor":"#fff3bf","fillStyle":"solid","strokeColor":"#f59e0b","strokeWidth":2},
  {"type":"arrow","id":"r1","x":55,"y":108,"width":0,"height":-14,"points":[[0,0],[0,-14]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"r2","x":55,"y":162,"width":0,"height":14,"points":[[0,0],[0,14]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"r3","x":28,"y":135,"width":-14,"height":0,"points":[[0,0],[-14,0]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"r4","x":82,"y":135,"width":14,"height":0,"points":[[0,0],[14,0]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"r5","x":73,"y":117,"width":10,"height":-10,"points":[[0,0],[10,-10]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"r6","x":37,"y":117,"width":-10,"height":-10,"points":[[0,0],[-10,-10]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"r7","x":73,"y":153,"width":10,"height":10,"points":[[0,0],[10,10]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"r8","x":37,"y":153,"width":-10,"height":10,"points":[[0,0],[-10,10]],"strokeColor":"#f59e0b","strokeWidth":2,"endArrowhead":null,"startArrowhead":null}
]
\`\`\`

## Sequence Diagram Pattern

Minimal 2-actor sequence diagram: actor boxes at top, dashed lifelines, solid request arrows, dashed response arrows.

\`\`\`json
[
  {"type":"cameraUpdate","width":600,"height":450,"x":0,"y":0},
  {"type":"rectangle","id":"stitle","x":0,"y":5,"width":600,"height":35,"strokeColor":"#e0e0e0","backgroundColor":"transparent","strokeWidth":1,"label":{"text":"Client-Server Flow","fontSize":20}},
  {"type":"rectangle","id":"ac1","x":80,"y":50,"width":140,"height":50,"backgroundColor":"#a5d8ff","fillStyle":"solid","roundness":{"type":3},"label":{"text":"Client","fontSize":18}},
  {"type":"rectangle","id":"ac2","x":380,"y":50,"width":140,"height":50,"backgroundColor":"#b2f2bb","fillStyle":"solid","roundness":{"type":3},"label":{"text":"Server","fontSize":18}},
  {"type":"arrow","id":"lf1","x":150,"y":100,"width":0,"height":310,"points":[[0,0],[0,310]],"strokeStyle":"dashed","strokeColor":"#b0b0b0","endArrowhead":null,"startArrowhead":null},
  {"type":"arrow","id":"lf2","x":450,"y":100,"width":0,"height":310,"points":[[0,0],[0,310]],"strokeStyle":"dashed","strokeColor":"#b0b0b0","endArrowhead":null,"startArrowhead":null},
  {"type":"rectangle","id":"act1","x":143,"y":140,"width":14,"height":120,"backgroundColor":"#a5d8ff","fillStyle":"solid","strokeColor":"#4a9eed"},
  {"type":"arrow","id":"m1","x":157,"y":160,"width":293,"height":0,"points":[[0,0],[293,0]],"endArrowhead":"arrow","label":{"text":"Request","fontSize":14}},
  {"type":"arrow","id":"m2","x":450,"y":230,"width":-293,"height":0,"points":[[0,0],[-293,0]],"strokeStyle":"dashed","endArrowhead":"arrow","label":{"text":"Response","fontSize":14}},
  {"type":"arrow","id":"m3","x":157,"y":310,"width":293,"height":0,"points":[[0,0],[293,0]],"endArrowhead":"arrow","label":{"text":"POST /data","fontSize":14}},
  {"type":"arrow","id":"m4","x":450,"y":380,"width":-293,"height":0,"points":[[0,0],[-293,0]],"strokeStyle":"dashed","endArrowhead":"arrow","label":{"text":"200 OK","fontSize":14}}
]
\`\`\`

## Bar Chart Pattern (Horizontal)
Background rectangles as bars, with text labels left-aligned and value labels right-aligned.
- Bar: \`{ "type": "rectangle", "width": VALUE_PROPORTIONAL, "height": 30, "backgroundColor": "#4a9eed", "fillStyle": "solid" }\`
- Label: standalone text to the left (x = bar.x - labelWidth - 10)
- Value: standalone text to the right (x = bar.x + bar.width + 10)
- Stack bars vertically with 15-20px gaps

## KPI Card Pattern
Rounded rectangle with multi-line label showing metric name, value, and trend.
- \`{ "type": "rectangle", "width": 180, "height": 80, "roundness": { "type": 3 }, "backgroundColor": "#a5d8ff", "fillStyle": "solid", "label": { "text": "Revenue\\n$4.2M\\n+12%", "fontSize": 16 } }\`
- Arrange 3-4 cards in a horizontal row with 20px gaps
- Use different background colors per card for visual variety

## Progress Bar Pattern
Two overlapping rectangles: background (full width, lighter) + fill (proportional width, darker).
Draw background FIRST (z-order), then fill on top.
- Background: \`{ "type": "rectangle", "width": 200, "height": 20, "backgroundColor": "#dbe4ff", "fillStyle": "solid", "roundness": { "type": 3 } }\`
- Fill: \`{ "type": "rectangle", "x": SAME, "y": SAME, "width": 200 * PERCENTAGE, "height": 20, "backgroundColor": "#4a9eed", "fillStyle": "solid", "roundness": { "type": 3 } }\`

## Gantt Chart / Timeline Pattern
Phase labels in a left column, horizontal bars as durations, diamonds as milestones.
- Phase label: \`{ "type": "rectangle", "x": LEFT_COL, "width": 140, "height": 40, "roundness": { "type": 3 }, "backgroundColor": COLOR, "label": { "text": "Phase", "fontSize": 16 } }\`
- Duration bar: \`{ "type": "rectangle", "x": TIMELINE_START + offset, "y": same_row, "width": DURATION_PX, "height": 40, "backgroundColor": COLOR, "fillStyle": "solid" }\`
- Progress overlay: same as bar but width: DURATION_PX * COMPLETION, backgroundColor: DARKER_COLOR
- Milestone: \`{ "type": "diamond", "width": 30, "height": 30 }\` at phase endpoint
- Month separators: vertical dashed lines across the chart area
- "Today" marker: vertical dashed line in red
- Use camera XL (1200x900) or XXL (1600x1200) for timelines with 5+ phases

## Radial Mind Map Pattern
Central ellipse with branches radiating outward at clock positions.
- Center: large ellipse (200x140), prominent color
- Branches: medium ellipses (150x80) at clock positions (12, 2, 4, 6, 8, 10)
- Sub-topics: small rectangles (120x50) extending from branches
- Use fixedPoint bindings for diagonal arrows: [1, 0.25] for upper-right, [0, 0.75] for lower-left, etc.
- Color-code each branch family (same hue for parent + children)
- Camera XL (1200x900) recommended

Common mistakes to avoid:
- **NEVER route arrows through shapes** — this is the #1 cause of unreadable diagrams. If a straight arrow from A to B would cross shape C, use a multi-segment arrow to route around C. Check EVERY arrow against ALL shapes in its path
- **Elements must not overlap or crowd** — leave 30px minimum between any two elements. Arrow labels need 60px clear space. If elements are too close, make the camera bigger or reduce element count
- **Camera size must match content with padding** — if your content is 500px tall, use 800x600 camera, not 500px. No padding = truncated edges
- **Center titles relative to the diagram below** — estimate the diagram's total width and center the title text over it, not over the canvas
- **Arrow labels need space** — long labels like "ATP + NADPH" overflow short arrows. Keep labels short or make arrows wider. Labeled arrows must be 150px+ long to avoid arrowhead overlap
- **Elements overlap when y-coordinates are close** — always check that text, boxes, and labels don't stack on top of each other
- **Arrow labels cluster when many arrows share an element** — stagger arrows using different fixedPoint positions (e.g., [0.3,1], [0.5,1], [0.7,1] for bottom edge) and make arrows long enough (200px+) to separate labels. For very dense areas, omit labels on obvious connections or use a legend instead
- **Fan-out from a single element** — when 3+ arrows leave the same edge, use different fixedPoint positions AND offset the arrow start x,y slightly (+-15px) to separate them visually. For very dense nodes, use multi-segment arrows to route around neighbors: one goes straight, one does an L-shape to avoid the first
- **Arrow labels render at the path midpoint** — no offset control. Keep labels to 1-3 words. For long annotations, use a nearby standalone text element instead
- **Don't use standalone text for titles** — the centering formula is unreliable. Use a transparent labeled rectangle spanning the content width instead. Labels auto-center perfectly

## Tips
- Do NOT call excalidraw_read_me again — you already have everything you need
- Use the color palette consistently
- Make sure text is readable (never use same text color as background color)
- Do NOT use emoji in text — they don't render in Excalidraw's font
- True pie/donut segments are not possible — Excalidraw has no arc shapes. Use concentric rings with a legend, or a stacked bar as an alternative representation
`;

/**
 * Registers all Excalidraw tools on the given McpServer.
 */
export function registerTools(server: McpServer): void {
  // ============================================================
  // Tool 1: read_me (call before drawing)
  // ============================================================
  server.registerTool(
    "excalidraw_read_me",
    {
      description: "Returns the Excalidraw element format reference with color palettes, examples, and tips. Call this BEFORE using create_excalidraw_diagram for the first time.",
      annotations: { readOnlyHint: true },
    },
    async (): Promise<CallToolResult> => {
      return { content: [{ type: "text", text: RECALL_CHEAT_SHEET }] };
    },
  );

  // ============================================================
  // Tool 2: create_diagram (headless render to PNG or SVG)
  // ============================================================
  server.registerTool(
    "create_excalidraw_diagram",
    {
      description: `Renders a hand-drawn Excalidraw diagram to a PNG or SVG file.
Call excalidraw_read_me first to learn the element format.
Returns the file path of the saved file.`,
      inputSchema: z.object({
        elements: z.string().describe(
          "JSON array string of Excalidraw elements. Must be valid JSON — no comments, no trailing commas. Keep compact. Call read_me first for format reference."
        ),
        outputPath: z.string().optional().describe(
          "Optional absolute file path for the output file. If omitted, saves to a temp file."
        ),
        format: z.enum(["png", "svg"]).optional().describe(
          "Output format: 'png' (default, rasterized) or 'svg' (vector, scalable). SVG is best for high-quality output that needs to scale to any size."
        ),
        files: z.record(z.string(),
          z.object({
            mimeType: z.string(),
            dataURL: z.string(),
          })
        ).optional().describe(
          "Optional map of file ID to image data for image elements. Each entry needs mimeType (e.g., 'image/png') and dataURL (e.g., 'data:image/png;base64,...'). Referenced by image elements via fileId."
        ),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ elements, outputPath, format, files }): Promise<CallToolResult> => {
      // Validate JSON before attempting render
      let parsed: any[];
      try {
        parsed = JSON.parse(elements);
        if (!Array.isArray(parsed)) {
          return {
            content: [{ type: "text", text: "elements must be a JSON array." }],
            isError: true,
          };
        }
      } catch (e) {
        return {
          content: [{ type: "text", text: `Invalid JSON in elements: ${(e as Error).message}. Ensure no comments, no trailing commas, and proper quoting.` }],
          isError: true,
        };
      }

      // Validate image fileIds against files map
      const imageEls = parsed.filter((el: any) => el.type === "image");
      if (imageEls.length > 0 && !files) {
        return {
          content: [{ type: "text", text: "Image elements found but no 'files' parameter provided." }],
          isError: true,
        };
      }
      if (imageEls.length > 0 && files) {
        const missing = imageEls.filter((el: any) => el.fileId && !files[el.fileId]);
        if (missing.length > 0) {
          const ids = missing.map((el: any) => el.fileId).join(", ");
          return {
            content: [{ type: "text", text: `Image element(s) reference missing fileId(s): ${ids}. Add them to the 'files' parameter.` }],
            isError: true,
          };
        }
      }

      try {
        const outputFormat = format ?? "png";
        const filesTyped = files as Record<string, { mimeType: string; dataURL: string }> | undefined;
        const result = outputFormat === "svg"
          ? await renderToSvg(elements, outputPath, { files: filesTyped })
          : await renderToPng(elements, outputPath, { files: filesTyped });
        const imgNote = imageEls.length > 0 ? `, ${imageEls.length} image${imageEls.length > 1 ? 's' : ''} embedded` : '';
        return {
          content: [{ type: "text", text: `${outputFormat.toUpperCase()} (${result.width}x${result.height}, ${result.inputCount} shapes rendered${imgNote}) saved to: ${result.path}` }],
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Render failed: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}

/**
 * Creates a new MCP server instance with Excalidraw drawing tools.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Excalidraw",
    version: "1.0.0",
  });
  registerTools(server);
  return server;
}
