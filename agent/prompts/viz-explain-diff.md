---
description: Use when the user asks for a visual, concise explanation of a code change, diff, branch, or PR. Produces HTML output.
---

# Visual Explain Diff

Create a **visual-first, scannable** explanation of the specified code change.

## Output Format

- Author as an **artifact bundle**: `scaffold_artifact` (`type: "html"`, title `Visual diff — <slug>`), write the entry HTML, `render_artifact` to validate and display. Fall back to a single self-contained HTML file at `/tmp/YYYY-MM-DD-viz-<slug>.html` if artifact tools are unavailable.
- Single self-contained HTML with embedded CSS/JS
- Responsive design (mobile-friendly)
- Use today's date in the title/filename

## Structure

### 1. TL;DR Card (top of page)
A summary box with:
- **What**: 1 sentence describing the change
- **Why**: 1 sentence on motivation
- **Impact**: 2-3 bullet points on key effects

### 2. Before/After Diagram
A single visual (flowchart, system diagram, or UI mockup) showing the state change. Embed labels directly in the diagram—no separate explanation paragraphs.

### 3. Code Changes
Use a visual diff viewer with:
- Color-coded highlights (green=added, red=removed, yellow=modified)
- Group related changes under icon-labeled cards:
  - ✅ Added
  - ❌ Removed  
  - 🔄 Changed
- Limit prose to ~100 words total; let the diff speak

### 4. Quiz (3 questions)
Interactive multiple-choice. Medium difficulty—tests understanding, not gotchas. Show feedback on click.

## Style Guidelines

- **Concise**: Max ~100 words per section
- **Visual-first**: Diagrams and cards over prose
- **Scannable**: Headers, icons, whitespace
- **No ASCII art**: Use HTML/CSS for all visuals
- **Code blocks**: Always use `<pre>` with `white-space: pre-wrap`

## Optional: Background Context
If essential context is needed, use a collapsible `<details>` element at the end—not a full section.
