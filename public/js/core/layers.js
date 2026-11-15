// The Seed, Sketch, and Sheet layers inside an entry body. Runs in the browser and in Node.
// Text the app doesn't recognize is kept and written back, never dropped.

export const DEPTHS = ['seed', 'sketch', 'sheet'];
const HEADINGS = { seed: 'Seed', sketch: 'Sketch', sheet: 'Sheet' };

// sheetFields: [{ id, label }] in order. Returns { preamble, seed, sketch, sheet: { [id]: text }, sheetExtra, extra }.
// extra is always empty now; it stays in the shape so a layers object made before the change still serializes.
// With no sheetFields, the Sheet is one free-text box and all of it lands in sheetExtra.
export function parseLayers(body, sheetFields = []) {
  const layers = { preamble: '', seed: '', sketch: '', sheet: {}, sheetExtra: '', extra: '' };
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const isLayerHeading = (l) => /^## /.test(l) && Object.values(HEADINGS).some((h) => l.slice(3).trim().toLowerCase() === h.toLowerCase());

  // A body with no layer headings is a legacy or hand-written entry: all of it is the Seed.
  if (!lines.some(isLayerHeading)) {
    layers.seed = body.trim();
    return layers;
  }

  // A layer or field whose heading appears twice picks up where it left off, one blank line later.
  const resuming = new Set();
  const resume = (chunk) => {
    while (chunk.length && !chunk[chunk.length - 1].trim()) chunk.pop();
    resuming.add(chunk);
  };
  const add = (chunk, line) => {
    if (resuming.has(chunk)) {
      if (!line.trim()) return;
      resuming.delete(chunk);
      if (chunk.length) chunk.push('');
    }
    chunk.push(line);
  };

  let current = 'preamble';
  const chunks = { preamble: [], seed: [], sketch: [], sheet: [] };
  for (const line of lines) {
    // Only the three layer names start a new layer. Any other heading is the writer's and stays where it was typed.
    if (isLayerHeading(line)) {
      const name = line.slice(3).trim().toLowerCase();
      current = DEPTHS.find((d) => HEADINGS[d].toLowerCase() === name);
      resume(chunks[current]);
      continue;
    }
    add(chunks[current], line);
  }
  layers.preamble = chunks.preamble.join('\n').trim();
  layers.seed = chunks.seed.join('\n').trim();
  layers.sketch = chunks.sketch.join('\n').trim();

  // Sheet fields are ### subsections matched by label. Any other ### heading stays in the field it was typed in,
  // or in sheetExtra when it comes before the first field.
  let field = null;
  const fieldChunks = {};
  const extraSheet = [];
  for (const line of chunks.sheet) {
    if (/^### /.test(line)) {
      const label = line.slice(4).trim().toLowerCase();
      const named = sheetFields.find((f) => f.label.toLowerCase() === label)?.id;
      if (named) {
        field = named;
        fieldChunks[field] ??= [];
        resume(fieldChunks[field]);
        continue;
      }
    }
    add(field ? fieldChunks[field] : extraSheet, line);
  }
  for (const f of sheetFields) layers.sheet[f.id] = (fieldChunks[f.id] ?? []).join('\n').trim();
  layers.sheetExtra = extraSheet.join('\n').trim();
  return layers;
}

// Writes only the layers that have text, in a fixed order, so the file stays clean for any reader.
export function serializeLayers(layers, sheetFields = []) {
  const parts = [];
  if (layers.preamble) parts.push(layers.preamble);
  if (layers.seed) parts.push(`## Seed\n\n${layers.seed}`);
  if (layers.sketch) parts.push(`## Sketch\n\n${layers.sketch}`);
  const sheetParts = sheetFields.filter((f) => layers.sheet?.[f.id]).map((f) => `### ${f.label}\n\n${layers.sheet[f.id]}`);
  if (layers.sheetExtra) sheetParts.push(layers.sheetExtra);
  if (sheetParts.length) parts.push(`## Sheet\n\n${sheetParts.join('\n\n')}`);
  if (layers.extra) parts.push(layers.extra);
  return parts.join('\n\n');
}

// The deepest layer that has any text, or 'seed'.
export function deepestFilled(layers) {
  if (Object.values(layers.sheet ?? {}).some(Boolean) || layers.sheetExtra) return 'sheet';
  if (layers.sketch) return 'sketch';
  return 'seed';
}
