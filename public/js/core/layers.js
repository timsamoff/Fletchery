// The Seed, Sketch, and Sheet layers inside an entry body. Runs in the browser and in Node.
// Text the app doesn't recognize is kept and written back, never dropped.

export const DEPTHS = ['seed', 'sketch', 'sheet'];
const HEADINGS = { seed: 'Seed', sketch: 'Sketch', sheet: 'Sheet' };

// sheetFields: [{ id, label }] in order. Returns { preamble, seed, sketch, sheet: { [id]: text }, sheetExtra, extra }.
export function parseLayers(body, sheetFields = []) {
  const layers = { preamble: '', seed: '', sketch: '', sheet: {}, sheetExtra: '', extra: '' };
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const isLayerHeading = (l) => /^## /.test(l) && Object.values(HEADINGS).some((h) => l.slice(3).trim().toLowerCase() === h.toLowerCase());

  // A body with no layer headings is a legacy or hand-written entry: all of it is the Seed.
  if (!lines.some(isLayerHeading)) {
    layers.seed = body.trim();
    return layers;
  }

  let current = 'preamble';
  const chunks = { preamble: [], seed: [], sketch: [], sheet: [], extra: [] };
  for (const line of lines) {
    if (/^## /.test(line)) {
      const name = line.slice(3).trim().toLowerCase();
      const depth = DEPTHS.find((d) => HEADINGS[d].toLowerCase() === name);
      current = depth ?? 'extra';
      if (!depth) chunks.extra.push(line);
      continue;
    }
    chunks[current].push(line);
  }
  layers.preamble = chunks.preamble.join('\n').trim();
  layers.seed = chunks.seed.join('\n').trim();
  layers.sketch = chunks.sketch.join('\n').trim();
  layers.extra = chunks.extra.join('\n').trim();

  // Sheet fields are ### subsections matched by label; unknown subsections are kept.
  let field = null;
  const fieldChunks = {};
  const extraSheet = [];
  for (const line of chunks.sheet) {
    if (/^### /.test(line)) {
      const label = line.slice(4).trim().toLowerCase();
      field = sheetFields.find((f) => f.label.toLowerCase() === label)?.id ?? null;
      if (field) fieldChunks[field] = [];
      else extraSheet.push(line);
      continue;
    }
    if (field) fieldChunks[field].push(line);
    else extraSheet.push(line);
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
  if (Object.values(layers.sheet ?? {}).some(Boolean)) return 'sheet';
  if (layers.sketch) return 'sketch';
  return 'seed';
}
