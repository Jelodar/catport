// Dynamic boundary to prevent collisions with file content
const RAND = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const BOUNDARY = `---CATPORT-BOUNDARY-${RAND}`;
const HEADER_BOUNDARY = `\n${BOUNDARY}`;

export const Multipart = {
  getInstruction: () => `**CRITICAL:** Rules for every file (follow strictly and EXACTLY):
- Separator: ${BOUNDARY}
- Each section MUST start with the separator.
- Immediately follow with "Content-Disposition: attachment; filename=\\"path\\"".
- Leave one empty line before the content.

## Examples

## Correct:

${BOUNDARY}
Content-Disposition: attachment; filename="src/index.js"

console.log("start");

${BOUNDARY}
Content-Disposition: attachment; filename="README.md"

# Title

${BOUNDARY}

## Wrong:

${BOUNDARY}
File: src/index.js    ✗ (Use Content-Disposition header)

${BOUNDARY}
(no headers)          ✗

Only output valid multipart sections with correct headers.`,

  header: (m) => {
    let out = `MIME-Version: 1.0\nContent-Type: multipart/mixed; boundary="${BOUNDARY}"\n\n`;
    out += `Prelude:\nProject: ${m.name}\n`;
    if (m.context) {
      out += `Context: ${m.context}\n`;
    }
    if (m.tree) {
      out += `\nStructure:\n${m.tree}\n`;
    }
    return out;
  },

  file: (f) => {
    let out = `${HEADER_BOUNDARY}\n`;
    out += `Content-Disposition: attachment; filename="${f.rel}"\n`;
    out += 'Content-Type: text/plain; charset=utf-8\n\n';
    out += f.content;
    return out;
  },

  footer: (m) => {
    let out = `${HEADER_BOUNDARY}--\n`;
    if (m.task) {
      out += `\nTask: ${m.task}\n`;
    }
    if (m.instructionText) {
      out += `\nInstructions:\n${m.instructionText}\n`;
    }
    return out;
  },

  parse: (txt, logger) => {
    let clean = txt;
    const mdMatch = txt.match(/(?:^|\n)```(?:\w+)?\s*([\s\S]*?)(?:^|\n)```/m);
    if (mdMatch) {
      clean = mdMatch[1];
    }

    const files = [];

    let boundary = BOUNDARY;
    const knownBoundaryMatch = clean.match(/---CATPORT-BOUNDARY-[a-z0-9]+/);
    if (knownBoundaryMatch) {
      boundary = knownBoundaryMatch[0];
    } else if (clean.includes('---CATPORT-BOUNDARY')) {
      boundary = '---CATPORT-BOUNDARY';
    }

    const parts = clean.split(boundary);

    // Skip preamble (index 0)
    for (let i = 1; i < parts.length; i++) {
      let part = parts[i];
      if (part.startsWith('--')) {
        break;
      }

      if (part.startsWith('\n')) {
        part = part.slice(1);
      } else if (part.startsWith('\r\n')) {
        part = part.slice(2);
      }

      const bodyStart = part.indexOf('\n\n');
      if (bodyStart === -1) {
        if (logger) {
          logger.warn(`Skipping multipart section ${i}: Header/Body separator not found.`);
        }
        continue;
      }

      const headers = part.slice(0, bodyStart);
      const content = part.slice(bodyStart + 2);

      const filenameMatch = headers.match(/filename="(.+?)"/);
      if (filenameMatch) {
        files.push({
          path: filenameMatch[1],
          content: content.trimEnd()
        });
      } else {
        if (logger) {
          logger.warn(`Skipping multipart section ${i}: No filename found in headers.`);
        }
      }
    }
    return files;
  }
};
