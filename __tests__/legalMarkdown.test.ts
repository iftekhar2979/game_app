import { parseInline, parseLegalDocument } from '../src/utils/legalMarkdown';

describe('reading a legal page', () => {
  it('reads the indented, seeded format', () => {
    // Rows seeded from a template literal carry its indentation.
    const blocks = parseLegalDocument(`
          **Privacy Policy**
          Effective date: September 10, 2026
          ...
        `);

    expect(blocks).toEqual([
      { kind: 'heading', text: 'Privacy Policy' },
      {
        kind: 'paragraph',
        inlines: [{ text: 'Effective date: September 10, 2026', bold: false }],
      },
    ]);
  });

  it('reads bullets and numbered items', () => {
    expect(parseLegalDocument('- First\n2. Second')).toEqual([
      { kind: 'bullet', marker: '•', inlines: [{ text: 'First', bold: false }] },
      { kind: 'bullet', marker: '2.', inlines: [{ text: 'Second', bold: false }] },
    ]);
  });

  it('treats a line with two bold runs as a paragraph, not a heading', () => {
    const [block] = parseLegalDocument('**Coins** have no **cash value**');
    expect(block.kind).toBe('paragraph');
  });

  it('reads markdown-style headings too', () => {
    expect(parseLegalDocument('## Your choices')).toEqual([
      { kind: 'heading', text: 'Your choices' },
    ]);
  });

  it('returns nothing for empty content', () => {
    expect(parseLegalDocument('')).toEqual([]);
    expect(parseLegalDocument(null)).toEqual([]);
  });
});

describe('inline bold', () => {
  it('splits bold runs out of a line', () => {
    expect(parseInline('Coins have **no cash value** at all')).toEqual([
      { text: 'Coins have ', bold: false },
      { text: 'no cash value', bold: true },
      { text: ' at all', bold: false },
    ]);
  });

  it('leaves plain text whole', () => {
    expect(parseInline('Plain line')).toEqual([{ text: 'Plain line', bold: false }]);
  });
});
