import { Markdown } from './markdown.js';
import { Xml } from './xml.js';
import { Json } from './json.js';
import { Yaml } from './yaml.js';
import { Multipart } from './multipart.js';
import { FORMAT } from '../config/constants.js';

const REGISTRY = {
  [FORMAT.MD]: Markdown,
  [FORMAT.XML]: Xml,
  [FORMAT.JSON]: Json,
  [FORMAT.YAML]: Yaml,
  [FORMAT.MULTIPART]: Multipart
};

export const Formatter = {
  register: (key, impl) => {
    REGISTRY[key] = impl;
  },
  get: (type) => {
    return REGISTRY[type] || Markdown;
  },
  detect: (content) => {
    const t = content.trim();

    if (t.startsWith('{')) {
      return Json;
    }
    if (t.startsWith('<')) {
      return Xml;
    }
    if (t.startsWith('meta:')) {
      return Yaml;
    }
    if (t.startsWith('MIME-Version: 1.0')) {
      return Multipart;
    }

    const codeBlockMatch = t.match(/```(\w*)\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      const lang = codeBlockMatch[1].toLowerCase();
      const body = codeBlockMatch[2].trim();

      if (lang === 'json') {
        return Json;
      }
      if (lang === 'xml') {
        return Xml;
      }
      if (lang === 'yaml' || lang === 'yml') {
        return Yaml;
      }

      if (body.startsWith('{')) {
        return Json;
      }
      if (body.startsWith('<')) {
        return Xml;
      }
      if (body.startsWith('meta:')) {
        return Yaml;
      }
      if (body.startsWith('files:')) {
        return Yaml;
      }
    }

    const sample = t.slice(0, 1024);
    if (sample.includes('<?xml') || sample.includes('<project name=')) {
      return Xml;
    }
    if (sample.includes('"files": [')) {
      return Json;
    }

    return Markdown;
  }
};
