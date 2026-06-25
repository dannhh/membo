export interface MdSection {
  level: number;
  title: string;
  body: string;
  children: MdSection[];
}

// Splits markdown into a heading tree (## through ######) so long notes can be
// rendered as a nested overview → detail structure instead of one flat scroll.
// Headings nest by level: a deeper heading becomes a child of the nearest
// shallower one, regardless of how many levels are skipped.
export function splitMarkdownSections(content: string): { intro: string; sections: MdSection[] } {
  const lines = content.split("\n");
  const intro: string[] = [];
  const sections: MdSection[] = [];
  const stack: MdSection[] = [];
  let inFence = false;

  function appendBody(line: string) {
    const target = stack[stack.length - 1];
    if (target) target.body += (target.body ? "\n" : "") + line;
    else intro.push(line);
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;

    const heading = !inFence && /^(#{2,6})\s+(.*)/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const sec: MdSection = { level, title: heading[2].trim(), body: "", children: [] };
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      if (stack.length) stack[stack.length - 1].children.push(sec);
      else sections.push(sec);
      stack.push(sec);
      continue;
    }
    appendBody(line);
  }

  return { intro: intro.join("\n").trim(), sections };
}
