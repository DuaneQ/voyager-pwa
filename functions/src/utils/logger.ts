const isDev = process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true';

const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.debug('[debug]', ...args);
  },
  info: (...args: any[]) => {
    console.info('[info]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[warn]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[error]', ...args);
  },
};

export default logger;
