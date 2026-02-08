import { XML_TAGS, XML_MODE } from '../config/constants.js';

const ESC = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;'
};

const UNESC = {
  lt: '<',
  gt: '>',
  amp: '&',
  apos: "'",
  quot: '"'
};

// XML 1.1 allows control characters 0x01-0x1F (except 0x00) in element content
// Null bytes (0x00) are never allowed in XML, even in 1.1
// For XML attributes, control characters 0x00-0x1F (except 0x09, 0x0A, 0x0D) and 0x7F-0x9F are not allowed
// eslint-disable-next-line no-control-regex
const NULL_BYTE = /\x00/g;
// eslint-disable-next-line no-control-regex
const INVALID_ATTR_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

const escapeStr = s => s.replace(/[<>&'"]/g, c => ESC[c]);
const unescapeStr = s => s.replace(/&(lt|gt|amp|apos|quot);/g, (_, c) => UNESC[c]);
const continueCdataSections = s => s.split(XML_TAGS.CDATA_CLOSE).join(XML_TAGS.CDATA_CLOSE + XML_TAGS.CDATA_OPEN);

const removeNullBytes = s => s.replace(NULL_BYTE, '');
const sanitizeAttr = s => s.replace(INVALID_ATTR_CHARS, '');

export const Xml = {
  getInstruction: () => `**CRITICAL:** Rules for every file (follow strictly and EXACTLY):
- Output valid XML.
- Use the <file path="..."> tag for every file.
- Wrap content in CDATA sections: ${XML_TAGS.CDATA_OPEN} ... ${XML_TAGS.CDATA_CLOSE}
- Do NOT use Markdown code fences (\`\`\`xml).

## Examples

## Correct:

<file path="src/main.js">${XML_TAGS.CDATA_OPEN}
console.log("hello");
${XML_TAGS.CDATA_CLOSE}</file>

<file path="readme.txt">${XML_TAGS.CDATA_OPEN}
Documentation
${XML_TAGS.CDATA_CLOSE}</file>

## Wrong:

\`\`\`xml
<file path="...">...  ✗ (No Markdown fences)
\`\`\`

<file>                ✗ (Missing path attribute)

Only output valid <file> elements with CDATA content.`,

  header: (m) => {
    const safeName = sanitizeAttr(m.name);
    let out = `<?xml version="1.1" encoding="UTF-8"?>\n<project name="${escapeStr(safeName)}">`;
    if (m.context) {
      const context = escapeStr(removeNullBytes(m.context));
      out += `\n  <context>${context}</context>`;
    }
    if (m.tree) {
      const tree = escapeStr(removeNullBytes(m.tree));
      out += `\n  <structure>\n${tree}\n  </structure>`;
    }
    out += '\n  <files>';
    return out;
  },

  file: (f, config = {}) => {
    const mode = config.xmlMode || XML_MODE.AUTO;
    let content = f.content;
    let useCdata = false;

    switch (mode) {
      case XML_MODE.ESCAPE: {
        content = escapeStr(removeNullBytes(content));
        break;
      }
      case XML_MODE.CDATA: {
        content = removeNullBytes(content);
        content = continueCdataSections(content);
        useCdata = true;
        break;
      }
      case XML_MODE.AUTO:
      default: {
        // AUTO mode: choose CDATA if content contains characters that need escaping
        // or characters that would make the XML invalid, otherwise use ESCAPE
        // eslint-disable-next-line no-control-regex
        const needsEscaping = /[&<>"']/.test(content) || /[\x00-\x1F\x7F-\x9F]/.test(content);
        if (needsEscaping) {
          content = removeNullBytes(content);
          content = continueCdataSections(content);
          useCdata = true;
        } else {
          content = escapeStr(removeNullBytes(content));
          useCdata = false;
        }
        break;
      }
    }
    const wrapped = useCdata ? `${XML_TAGS.CDATA_OPEN}${content}${XML_TAGS.CDATA_CLOSE}` : content;
    const safePath = sanitizeAttr(f.rel);
    return `\n    <file path="${escapeStr(safePath)}">${wrapped}</file>`;
  },

  footer: (m) => {
    let out = '\n  </files>';
    if (m.instructionText) {
      const instruction = escapeStr(removeNullBytes(m.instructionText));
      out += `\n  <instruction>${instruction}</instruction>`;
    }
    if (m.task) {
      const task = escapeStr(removeNullBytes(m.task));
      out += `\n  <task>${task}</task>`;
    }
    return out + '\n</project>';
  },

  parse: (txt, logger) => {

    let clean = txt;
    let firstTag = clean.indexOf('<');
    while (firstTag !== -1 && firstTag < clean.length - 1 && clean[firstTag + 1] === '?') {
      const endPI = clean.indexOf('?>', firstTag);
      if (endPI === -1) {
        break;
      }
      firstTag = clean.indexOf('<', endPI + 2);
    }
    const lastTag = clean.lastIndexOf('>');
    if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
      clean = clean.slice(firstTag, lastTag + 1);
    }

    const files = [];
    let pos = 0;

    while (pos < clean.length) {
      const openTag = '<file path="';
      const startIdx = clean.indexOf(openTag, pos);
      if (startIdx === -1) {
        break;
      }

      const pathStart = startIdx + openTag.length;
      const quoteEnd = clean.indexOf('">', pathStart);
      if (quoteEnd === -1) {
        if (logger) {
          logger.warn(`Skipping malformed file tag at index ${startIdx}: Missing closing quote or bracket.`);
        }
        pos = startIdx + openTag.length;
        continue;
      }

      const path = unescapeStr(clean.slice(pathStart, quoteEnd));
      const contentStart = quoteEnd + 2;
      let scanPos = contentStart;
      let endIdx = -1;

      while (scanPos < clean.length) {
        const closeTagIdx = clean.indexOf('</file>', scanPos);
        const cdataIdx = clean.indexOf(XML_TAGS.CDATA_OPEN, scanPos);

        if (closeTagIdx === -1) {
          break;
        }

        if (cdataIdx === -1 || closeTagIdx < cdataIdx) {
          endIdx = closeTagIdx;
          break;
        }

        const cdataEndIdx = clean.indexOf(XML_TAGS.CDATA_CLOSE, cdataIdx);
        scanPos = cdataEndIdx === -1 ? clean.length : cdataEndIdx + XML_TAGS.CDATA_CLOSE.length;
      }

      if (endIdx === -1) {
        if (logger) {
          logger.warn(`Skipping file "${path}": Missing closing </file> tag.`);
        }
        break;
      }

      let content = clean.slice(contentStart, endIdx);
      const trimmed = content.trim();

      if (trimmed.startsWith(XML_TAGS.CDATA_OPEN) && trimmed.endsWith(XML_TAGS.CDATA_CLOSE)) {
        const cdataOpenIdx = content.indexOf(XML_TAGS.CDATA_OPEN);
        const cdataCloseIdx = content.lastIndexOf(XML_TAGS.CDATA_CLOSE);
        
        if (cdataOpenIdx !== -1 && cdataCloseIdx !== -1 && cdataCloseIdx > cdataOpenIdx) {
          content = content.slice(cdataOpenIdx + XML_TAGS.CDATA_OPEN.length, cdataCloseIdx)
            .split(XML_TAGS.CDATA_CLOSE + XML_TAGS.CDATA_OPEN)
            .join(XML_TAGS.CDATA_CLOSE);
        } else {
          // Malformed CDATA, treat as escaped content
          content = unescapeStr(content);
        }
      } else {
        content = unescapeStr(content);
      }

      files.push({
        path,
        content
      });
      pos = endIdx + 7;
    }
    return files;
  }
};
