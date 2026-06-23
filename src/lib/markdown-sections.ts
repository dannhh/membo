export interface MdSection {
  level: 2 | 3;
  title: string;
  body: string;
  children: MdSection[];
}

// Splits markdown into a heading tree (## and ###) so long notes can be
// rendered as collapsible overview → detail sections instead of one flat scroll.
export function splitMarkdownSections(content: string): { intro: string; sections: MdSection[] } {
  const lines = content.split("\n");
  const intro: string[] = [];
  const sections: MdSection[] = [];
  let current2: MdSection | null = null;
  let current3: MdSection | null = null;
  let inFence = false;

  function appendBody(line: string) {
    const target = current3 ?? current2;
    if (target) target.body += (target.body ? "\n" : "") + line;
    else intro.push(line);
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;

    const h3 = !inFence && /^###\s+(.*)/.exec(line);
    const h2 = !inFence && !h3 && /^##\s+(.*)/.exec(line);

    if (h3) {
      const sec: MdSection = { level: 3, title: h3[1].trim(), body: "", children: [] };
      current3 = sec;
      if (current2) current2.children.push(sec);
      else sections.push(sec);
      continue;
    }
    if (h2) {
      const sec: MdSection = { level: 2, title: h2[1].trim(), body: "", children: [] };
      current2 = sec;
      current3 = null;
      sections.push(sec);
      continue;
    }
    appendBody(line);
  }

  return { intro: intro.join("\n").trim(), sections };
}
