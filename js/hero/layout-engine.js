// Bridges @chenglou/pretext's DOM-free line-breaking to per-character x/y
// positions we can render as absolutely-positioned spans.
//
// Pretext gives us correct, CSS-matching line-break boundaries (via
// prepareWithSegments + layoutWithLines) without ever touching the DOM.
// It does NOT hand back per-glyph positions -- that's a deliberate scope
// limit of the library (it optimizes for "how many lines / how tall",
// not "where is character N"). We derive x-offsets ourselves from the
// same font string via a single cached <canvas> 2D context, measuring
// cumulative substrings so kerning/ligature width changes are captured
// reasonably well (not just isolated per-glyph widths).

let measureCanvas = null;
let measureCtx = null;
let cachedFont = "";

function getMeasureCtx(font) {
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
    measureCtx = measureCanvas.getContext("2d");
  }
  if (cachedFont !== font) {
    measureCtx.font = font;
    cachedFont = font;
  }
  return measureCtx;
}

/** Builds the CSS font shorthand string for a given element, for use with canvas measureText. */
export function fontStringFromElement(el) {
  const cs = getComputedStyle(el);
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
}

/**
 * Splits `text` into lines that match the wrapping the browser would
 * produce at `maxWidth`, using pretext's DOM-free layout engine.
 * Returns an array of line strings.
 */
export async function measureLines({ text, font, maxWidth }) {
  const { prepareWithSegments, layoutWithLines } = await import(
    "https://esm.sh/@chenglou/pretext@0.0.8"
  );
  const prepared = prepareWithSegments(text, font, { whiteSpace: "normal" });
  const { lines } = layoutWithLines(prepared, maxWidth, 1);
  return lines.map((line) => line.text);
}

/**
 * Given already-broken lines, computes {char, x, y, lineIndex} for every
 * character (including spaces) via cumulative canvas substring measurement.
 */
export function computeCharPositions(lines, font, lineHeightPx) {
  const ctx = getMeasureCtx(font);
  const positions = [];

  lines.forEach((lineText, lineIndex) => {
    let prevWidth = 0;
    for (let i = 0; i < lineText.length; i++) {
      const width = ctx.measureText(lineText.slice(0, i + 1)).width;
      positions.push({
        char: lineText[i],
        x: prevWidth,
        y: lineIndex * lineHeightPx,
        lineIndex,
      });
      prevWidth = width;
    }
  });

  return positions;
}

/** Local fallback line-breaker (greedy word-wrap), used only if the pretext import fails. */
export function greedyWrapFallback(text, font, maxWidth) {
  const ctx = getMeasureCtx(font);
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
