/**
 * A small reader for the legal pages' text.
 *
 * The content is written by admins in a light markdown - `**Heading**` lines,
 * `- ` bullets and inline `**bold**` - and older rows carry the indentation of
 * the template literal they were seeded from. A full markdown renderer would be
 * a new dependency for three pages; this covers exactly what they use, and
 * anything it does not recognise is shown as a plain paragraph rather than lost.
 */

export interface LegalInline {
  text: string;
  bold: boolean;
}

export type LegalBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; inlines: LegalInline[] }
  | { kind: 'bullet'; marker: string; inlines: LegalInline[] };

export function parseLegalDocument(content: string | null | undefined): LegalBlock[] {
  const lines = String(content ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim());

  const blocks: LegalBlock[] = [];

  for (const line of lines) {
    // `...` was a placeholder in the old seed text, not content.
    if (!line || line === '...') continue;

    const heading = /^\*\*(.+)\*\*$/.exec(line) ?? /^#{1,3}\s+(.+)$/.exec(line);
    if (heading && !heading[1].includes('**')) {
      blocks.push({ kind: 'heading', text: heading[1].trim() });
      continue;
    }

    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    if (bullet) {
      blocks.push({ kind: 'bullet', marker: '•', inlines: parseInline(bullet[1]) });
      continue;
    }

    const numbered = /^(\d{1,3})[.)]\s+(.+)$/.exec(line);
    if (numbered) {
      blocks.push({
        kind: 'bullet',
        marker: `${numbered[1]}.`,
        inlines: parseInline(numbered[2]),
      });
      continue;
    }

    blocks.push({ kind: 'paragraph', inlines: parseInline(line) });
  }

  return blocks;
}

export function parseInline(text: string): LegalInline[] {
  const parts: LegalInline[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), bold: false });
    parts.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push({ text: text.slice(last), bold: false });

  return parts.length ? parts : [{ text, bold: false }];
}
