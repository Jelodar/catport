import { resolve } from 'node:path';

export const ConfigLoader = {
  load: async (io) => {
    try {
      const path = resolve(io.cwd(), '.catport.json');
      const content = await io.readText(path);
      return JSON.parse(content);
    } catch {
      // Fail silently if config file is missing or invalid, 
      // relying on defaults handled by ArgParser.
      return {};
    }
  }
};
