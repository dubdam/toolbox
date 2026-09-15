process.env.HOST = '127.0.0.1';
process.env.PORT ??= '3460';
await import('./build/index.js');
