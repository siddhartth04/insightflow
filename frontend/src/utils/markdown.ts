/**
 * A deliberately small markdown renderer.
 *
 * Model output is limited to headings, emphasis, lists, quotes, code and links,
 * so a focused renderer avoids pulling in a parser dependency. All text is
 * escaped before any tag is introduced, so model output cannot inject HTML.
 */

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-interactive px-1.5 py-0.5 font-mono text-[0.85em] text-ink">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
  // Only http(s) links are linkified, so no javascript: URLs can slip through.
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent underline underline-offset-2 hover:brightness-110">$1</a>',
  );
  return out;
}

/** Render a markdown subset to sanitized HTML. */
export function renderMarkdown(markdown: string): string {
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeLines: string[] = [];
  let paragraph: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p class="mb-4 leading-[1.75] text-muted">${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  for (const line of lines) {
    const fence = line.trim().startsWith('```');
    if (fence) {
      if (inCode) {
        html.push(
          `<pre class="mb-4 overflow-x-auto rounded-lg border border-hairline bg-canvas p-4"><code class="font-mono text-xs leading-relaxed text-ink">${escapeHtml(
            codeLines.join('\n'),
          )}</code></pre>`,
        );
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const sizes: Record<number, string> = {
        1: 'mb-4 mt-7 text-xl font-semibold tracking-tight text-ink',
        2: 'mb-3 mt-6 text-lg font-semibold tracking-tight text-ink',
        3: 'mb-2 mt-5 text-[0.95rem] font-semibold text-ink',
        4: 'mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-muted',
      };
      html.push(`<h${level} class="${sizes[level]}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push('<hr class="my-6 border-hairline" />');
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(
        `<blockquote class="mb-4 border-l-2 border-accent/60 bg-elevated/60 py-2 pl-4 pr-3 text-muted">${inline(
          quote[1],
        )}</blockquote>`,
      );
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    const unordered = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (ordered || unordered) {
      flushParagraph();
      const wanted: 'ul' | 'ol' = ordered ? 'ol' : 'ul';
      if (listType !== wanted) {
        closeList();
        const base = 'mb-4 space-y-1.5 pl-5 text-muted';
        html.push(
          wanted === 'ol'
            ? `<ol class="${base} list-decimal marker:text-faint">`
            : `<ul class="${base} list-disc marker:text-accent/70">`,
        );
        listType = wanted;
      }
      html.push(`<li class="leading-[1.7] pl-1">${inline((ordered ?? unordered)![1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  if (inCode && codeLines.length) {
    html.push(
      `<pre class="mb-4 overflow-x-auto rounded-lg border border-hairline bg-canvas p-4"><code class="font-mono text-xs text-ink">${escapeHtml(
        codeLines.join('\n'),
      )}</code></pre>`,
    );
  }
  flushParagraph();
  closeList();

  return html.join('\n');
}
