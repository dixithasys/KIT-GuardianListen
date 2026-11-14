import React from 'react';

/**
 * FormattedMessage component
 * Converts Markdown formatting (###, **, *, `, -, 1., >, | table |) into clean, semantic React elements
 * so no raw asterisks or markdown syntax leak into the UI.
 */
export default function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let currentListType = 'ul'; // 'ul' | 'ol'
  let currentTable = [];

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      if (currentListType === 'ol') {
        elements.push(
          <ol key={`${keyPrefix}-ol`} style={{ margin: '6px 0 10px 22px', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {currentList.map((item, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`${keyPrefix}-ul`} style={{ margin: '6px 0 10px 20px', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {currentList.map((item, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      currentListType = 'ul';
    }
  };

  const flushTable = (keyPrefix) => {
    if (currentTable.length > 0) {
      // Filter out divider line (e.g. | :--- | :--- |)
      const validRows = currentTable.filter(r => !r.every(cell => /^:?-+:?$/.test(cell.trim())));
      if (validRows.length > 0) {
        const headerRow = validRows[0];
        const bodyRows = validRows.slice(1);
        elements.push(
          <div key={`${keyPrefix}-table`} style={{ overflowX: 'auto', margin: '10px 0' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      borderBottom: '2px solid var(--border)',
                    }}>
                      {renderInline(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)' }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}>
                        {renderInline(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      currentTable = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(index);
      flushTable(index);
      return;
    }

    // Markdown Table Row: | cell | cell |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(index);
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      currentTable.push(cells);
      return;
    } else {
      flushTable(index);
    }

    // Heading 3 or 2 or 1
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList(index);
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <div
          key={index}
          style={{
            fontWeight: 800,
            fontSize: 15,
            color: 'var(--text-primary)',
            marginTop: index === 0 ? 0 : 12,
            marginBottom: 6,
            letterSpacing: -0.2,
          }}
        >
          {renderInline(headingText)}
        </div>
      );
      return;
    }

    // Ordered List item (e.g. "1. ", "2. ")
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (currentList.length > 0 && currentListType !== 'ol') {
        flushList(index);
      }
      currentListType = 'ol';
      currentList.push(olMatch[2]);
      return;
    }

    // Unordered List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (currentList.length > 0 && currentListType !== 'ul') {
        flushList(index);
      }
      currentListType = 'ul';
      const itemText = trimmed.substring(2);
      currentList.push(itemText);
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList(index);
      const quoteText = trimmed.substring(2);
      elements.push(
        <div
          key={index}
          style={{
            margin: '8px 0',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--accent)',
            background: 'var(--accent-light)',
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
        >
          {renderInline(quoteText)}
        </div>
      );
      return;
    }

    // Regular paragraph
    flushList(index);
    elements.push(
      <p key={index} style={{ margin: '4px 0', lineHeight: 1.55 }}>
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList('final');
  flushTable('final');

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{elements}</div>;
}

/**
 * Parses inline markdown: **bold**, `code`, and *italic*
 */
function renderInline(str) {
  if (!str) return '';

  const tokens = [];
  let remaining = str;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/);

    if (boldMatch && (!codeMatch || remaining.indexOf('**') <= remaining.indexOf('`'))) {
      if (boldMatch[1]) {
        tokens.push(renderSimpleItalic(boldMatch[1], keyIdx++));
      }
      tokens.push(
        <strong key={keyIdx++} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
      continue;
    }

    if (codeMatch) {
      if (codeMatch[1]) {
        tokens.push(renderSimpleItalic(codeMatch[1], keyIdx++));
      }
      tokens.push(
        <code
          key={keyIdx++}
          style={{
            fontSize: '0.88em',
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(124, 58, 237, 0.12)',
            color: 'var(--accent)',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    tokens.push(renderSimpleItalic(remaining, keyIdx));
    break;
  }

  return tokens;
}

function renderSimpleItalic(text, key) {
  if (text.startsWith('*') && text.endsWith('*') && text.length > 2) {
    return (
      <em key={key} style={{ fontStyle: 'italic', opacity: 0.9 }}>
        {text.slice(1, -1)}
      </em>
    );
  }
  return text;
}
