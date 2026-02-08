const quotePath = (path) => {
  if (process.platform === 'win32') {
    return `"${path.replace(/"/g, '""')}"`;
  }
  return `'${path.replace(/'/g, "'\\''")}'`;
};

export const Processor = {
  run: async (item, config, io, services) => {
    const { analyzer, optimizer } = services;

    if (config.skeleton) {
      return { ...item, content: '' };
    }

    try {
      const SAMPLE_SIZE = 1024 * 8;
      const sample = await io.readSample(item.path, SAMPLE_SIZE);

      if (analyzer.isBinary(sample)) {
        return { ...item, content: '(binary omitted)' };
      }

      let raw;
      if (sample.length < SAMPLE_SIZE) {
        raw = sample.toString('utf8');
      } else {
        const maxBytes = config.maxSize !== undefined ? config.maxSize : 0;
        const stats = await io.stat(item.path);
        
        if (maxBytes > 0 && stats.size > maxBytes && !config.optimizeCmd) {
          return { ...item, content: `(file too large for processing: ${stats.size} bytes)` };
        }

        raw = await io.readText(item.path);
      }
      
      let content;
      if (config.optimizeCmd) {
        // Standard Unix convention: {} represents the file path
        if (config.optimizeCmd.includes('{}')) {
          const safePath = quotePath(item.path);
          const cmd = config.optimizeCmd.split('{}').join(safePath);
          content = await io.exec(cmd); 
        } else {
          // Pipe content to stdin
          content = await io.execPipe(config.optimizeCmd, raw);
        }
      } else {
        const ext = item.rel.split('.').pop();
        content = optimizer.run(raw, ext, config.optimize);
      }
      
      return { ...item, content };
    } catch (err) {
      return { error: err };
    }
  }
};
