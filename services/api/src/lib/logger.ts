type Level = 'info' | 'warn' | 'error';

function log(level: Level, msg: string, data?: Record<string, unknown>): void {
  const entry = { level, time: new Date().toISOString(), msg, ...data };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
};
