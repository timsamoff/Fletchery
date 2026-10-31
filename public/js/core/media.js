// Images and their sidecars. A sidecar is `<image>.meta.md`: caption and alt text in the frontmatter, and a
// "What to notice" section in the body. Runs in the browser and in Node.
import { parseEntry, serializeEntry } from './entry.js';

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
export const PORTRAIT_FILE = 'portrait.jpg';
export const PORTRAIT_SIZE = 512;

const NOTICE_HEADING = '## What to notice';

export const isImage = (name) => IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
export const sidecarPath = (imagePath) => `${imagePath}.meta.md`;

// Returns { caption, alt, notice }. Missing or unreadable sidecars give empty strings.
export function parseSidecar(raw) {
  if (!raw) return { caption: '', alt: '', notice: '' };
  const { frontmatter, body } = parseEntry(raw);
  return { caption: frontmatter.caption ?? '', alt: frontmatter.alt ?? '', notice: noticeSection(body).text };
}

// The sidecar after a change. Other frontmatter keys and any other text in the body are kept.
export function updateSidecar(raw, { caption, alt, notice }) {
  const existing = raw ? parseEntry(raw) : { frontmatter: {}, body: '' };
  const frontmatter = { ...existing.frontmatter, caption, alt };
  const { before, after } = noticeSection(existing.body);
  const section = notice.trim() ? `${NOTICE_HEADING}\n\n${notice.trim()}\n` : '';
  const body = [before.trim(), section.trim(), after.trim()].filter(Boolean).join('\n\n');
  return serializeEntry(frontmatter, body);
}

// Splits the body around the "What to notice" section, which runs to the next ## heading.
function noticeSection(body) {
  const start = body.indexOf(NOTICE_HEADING);
  if (start === -1) return { before: body, text: '', after: '' };
  const rest = body.slice(start + NOTICE_HEADING.length);
  const next = rest.search(/\n## /);
  const text = (next === -1 ? rest : rest.slice(0, next)).trim();
  return { before: body.slice(0, start), text, after: next === -1 ? '' : rest.slice(next) };
}
