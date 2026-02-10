import { Path } from '../utils/path.js';

export const FILE_MARKER = '### ◼◼◼ FILE:';
export const INSTRUCTION_MARKER = '### ◼◼◼ END OF FILES - INSTRUCTIONS FOLLOW';
const ESCAPED_MARKER = FILE_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FILE_MARKER_RE = new RegExp(`^\\s*${ESCAPED_MARKER}\\s*(.+)$`, 'gim');

export const Markdown = {
  getInstruction: () => `**CRITICAL:** Rules for every file (follow strictly and EXACTLY):
- Output only blocks starting with "${FILE_MARKER} <path>" followed by a fenced code block.
- Code block with language tag must follow immediately. Nothing else.
- No bold, no "(updated / fixed)", no explanations, no extra text.

## Examples

## Correct:

${FILE_MARKER} src/components/Button.tsx
\`\`\`tsx
import React from 'react';
export const Button = () => <button>Click</button>;
\`\`\`

${FILE_MARKER} utils/helpers.ts
\`\`\`ts
export const format = (n: number) => n.toFixed(2);
\`\`\`

## Wrong:

\`\`\`
**src/app.ts**          ✗
File: config.json       ✗
Here is the update:     ✗
\`\`\`

Only output "${FILE_MARKER} <path>" followed by a fenced code block. Nothing else.`,

  header: (m) => {
    let out = `# ${m.name}\n`;
    if (m.context) {
      out += `> **Context**: ${m.context}\n`;
    }
    if (m.tree) {
      out += `\n## Structure\n\`\`\`text\n${m.tree}\n\`\`\`\n\n`;
    }
    return out + '---\n\n';
  },

  file: (f) => {
    const content = f.content || '';
    const ext = f.rel.split('.').pop() ?? 'txt';
    const existingFences = content.match(/^(`{3,}|~{3,})/gm) ?? [];
    const longest = existingFences.reduce((len, m) => Math.max(len, m.length), 0);
    const fenceLen = Math.max(3, longest + 1);
    const fence = '`'.repeat(fenceLen);

    return `${FILE_MARKER} ${f.rel}\n${fence}${ext}\n${content}\n${fence}\n\n`;
  },

  footer: (m) => {
    let out = m.task ? `\n---\n> **Task**: ${m.task}\n` : '';
    if (m.instructionText) {
      out += `\n${INSTRUCTION_MARKER}\n${m.instructionText}\n`;
    }
    return out;
  },

  parse: (text, logger) => {
    const files = [];
    let pos = 0;

    while (true) {
      // Check if we hit the instructions block before the next file
      const instrIdx = text.indexOf(INSTRUCTION_MARKER, pos);
      
      FILE_MARKER_RE.lastIndex = pos;
      const markerMatch = FILE_MARKER_RE.exec(text);
      
      if (!markerMatch) {
        break;
      }

      // If instructions appear before the next file marker, we are done
      if (instrIdx !== -1 && instrIdx < markerMatch.index) {
        break;
      }

      const rawPath = markerMatch[1].trim()
        .replace(/[:'"`]*$/, '')          // trailing : or quotes
        .replace(/\s*\(.*\)$/, '')        // (updated), (copy), …
        .replace(/\s*\[.*\]$/, '')        // [modified], …
        .trim();

      const path = Path.clean(rawPath);
      if (!path) {
        pos = markerMatch.index + markerMatch[0].length;
        if (logger) {
          logger.warn(`Skipping invalid path in marker at index ${markerMatch.index}: "${rawPath}"`);
        }
        continue;
      }

      const afterMarkerPos = markerMatch.index + markerMatch[0].length;
      const rest = text.slice(afterMarkerPos);

      const openFenceMatch = rest.match(/^([ \t]*)(`{3,}|~{3,})/m);
      if (!openFenceMatch) {
        pos = afterMarkerPos;
        if (logger) {
          logger.warn(`Skipping file "${path}": Marker found but no fenced code block follows immediately.`);
        }
        continue;
      }

      const indent = openFenceMatch[1];
      const fencePart = openFenceMatch[2];
      const fenceChar = fencePart[0];
      const fenceLen = fencePart.length;
      const fenceRE = new RegExp(`^${indent}${fenceChar}{${fenceLen},}(?:[ \t]*|[ \t]+\\S.*)$`, 'm');

      const fenceStartPos = afterMarkerPos + openFenceMatch.index + openFenceMatch[0].length;
      const afterFence = rest.slice(openFenceMatch.index + openFenceMatch[0].length);
      const langLineMatch = afterFence.match(/^(.*\r?\n)/);
      const codeBlockStart = fenceStartPos + (langLineMatch?.[0].length ?? 0);

      const closeMatch = fenceRE.exec(text.slice(codeBlockStart));
      if (!closeMatch) {
        if (logger) {
          logger.warn(`Skipping file "${path}": Code block not closed (reached end of input).`);
        }
        // Skip this file and continue with the next one
        pos = afterMarkerPos;
        continue;
      }

      const closePosAbs = codeBlockStart + closeMatch.index + closeMatch[0].length;

      let content = text.slice(codeBlockStart, codeBlockStart + closeMatch.index);

      if (indent) {
        const indentRE = new RegExp(`^${indent}`, 'gm');
        content = content.replace(indentRE, '');
      }

      content = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trimEnd();

      if (content.length > 0 || text.slice(codeBlockStart, codeBlockStart + closeMatch.index).trim().length > 0) {
        files.push({ path, content });
      } else {
        if (logger) {
          logger.warn(`Skipping file "${path}": Empty code block extracted.`);
        }
      }

      pos = closePosAbs;

      const trailing = text.slice(pos).match(/^\r?\n/);
      if (trailing) {
        pos += trailing[0].length;
      }
    }

    return files;
  }
};
