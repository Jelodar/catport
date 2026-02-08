const INSTRUCTION_MARKER = '### ◼◼◼ INSTRUCTIONS';

export const Yaml = {
  getInstruction: () => `**CRITICAL:** Rules for every file (follow strictly and EXACTLY):
- Return valid YAML.
- The root element MUST be "files", containing a list.
- Each item MUST have "path" and "content" keys.
- Use block scalars (|) for content to preserve indentation and newlines exactly.

## Examples

## Correct:

files:
  - path: "src/app.js"
    content: |
      const x = 1;
      console.log(x);

  - path: "README.md"
    content: |
      # Title
      Description here.

## Wrong:

- path: "src/app.js"  ✗ (Missing root "files" key)

files: [ ... ]        ✗ (Use block style for content readability)

Only output valid YAML with a "files" root key.`,

  header: (m) => {
    let out = `meta:\n  name: "${m.name}"`;
    if (m.context) {
      out += `\n  context: |\n    ${m.context.replace(/\n/g, '\n    ')}`;
    }
    if (m.tree) {
      out += `\n  tree: |\n    ${m.tree.replace(/\n/g, '\n    ')}`;
    }
    out += '\nfiles:';
    return out;
  },

  file: (f) => {
    const indent = '    ';
    let content = f.content.trimEnd();
    if (content.length > 0) {
      content = '\n' + indent + content.replace(/\n/g, `\n${indent}`);
    } else {
      content = ' ""';
    }
    return `\n  - path: "${f.rel}"\n    content: |${content}`;
  },

  footer: (m) => {
    let out = m.task ? `\ntask: |\n  ${m.task.replace(/\n/g, '\n  ')}` : '';
    if (m.instructionText) {
      out += '\n### ◼◼◼ INSTRUCTIONS\n' + m.instructionText.split('\n').map(l => '### ' + l).join('\n');
    }
    return out;
  },

  parse: (txt) => {
    const splitIdx = txt.indexOf(INSTRUCTION_MARKER);
    const clean = splitIdx !== -1 ? txt.slice(0, splitIdx) : txt;

    const files = [];
    const lines = clean.split(/\r?\n/);
    let currentPath = null;
    let currentContent = [];
    let inContent = false;
    let baseIndent = 0;

    for (const line of lines) {
      const trim = line.trim();

      // Matches: - path: "foo" OR - path: foo
      if (trim.match(/^-?\s*path:/)) {
        if (currentPath) {
          files.push({
            path: currentPath,
            content: currentContent.join('\n').trimEnd()
          });
        }
        const match = trim.match(/^-?\s*path:\s*(?:"([^"]*)"|'([^']*)'|([^\s'"]+))/);
        if (match) {
          currentPath = match[1] || match[2] || match[3] || null;
          currentContent = [];
          inContent = false;
        }
        continue;
      }

      // Matches: content: |  OR  content: >  OR  content: | # comment
      if (currentPath && trim.match(/^content:\s*[|>]/)) {
        inContent = true;
        baseIndent = 0;
        continue;
      }

      if (inContent) {
        if (trim.length === 0) {
          currentContent.push('');
          continue;
        }

        const leadingSpaces = line.search(/\S|$/);

        if (baseIndent === 0) {
          baseIndent = leadingSpaces;
        }

        if (leadingSpaces < baseIndent) {
          inContent = false;
          // Lookahead: does this line start a new path?
          if (trim.match(/^-?\s*path:/)) {
            files.push({
              path: currentPath,
              content: currentContent.join('\n').trimEnd()
            });
            const match = trim.match(/^-?\s*path:\s*(?:"([^"]*)"|'([^']*)'|([^\s'"]+))/);
            if (match) {
              currentPath = match[1] || match[2] || match[3] || null;
              currentContent = [];
            }
            inContent = false;
          }
        } else {
          currentContent.push(line.slice(baseIndent));
        }
      }
    }

    if (currentPath && inContent) {
      files.push({
        path: currentPath,
        content: currentContent.join('\n').trimEnd()
      });
    } else if (currentPath && !inContent && files[files.length-1]?.path !== currentPath) {
      // Case where content was empty or missing
      // But we prioritize validity.
    }

    return files;
  }
};
