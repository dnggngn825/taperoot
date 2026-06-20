import http from 'node:http';
import { createYoga } from 'graphql-yoga';
import { buildSchema } from './schema/index.js';
import { initOwner } from './schema/queries.js';
import { logger } from './lib/logger.js';

const port = Number(process.env.API_PORT ?? 4000);
const schema = buildSchema();

// Explicit CORS allowlist — never `origin: '*'` combined with credentials
// (a reflected wildcard lets any site make credentialed cross-origin requests).
// Local Vite = :5173, compose web preview = :8080; override via WEB_ORIGIN
// (comma-separated) in other environments.
const corsOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const yoga = createYoga({
  schema,
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

const server = http.createServer(yoga);

initOwner()
  .then(() => {
    server.listen(port, () => {
      logger.info('GraphQL server listening', { port });
      logger.info(`GraphiQL → http://localhost:${port}/graphql`);
    });
  })
  .catch((err: unknown) => {
    logger.error('Failed to initialise owner — is the DB seeded?', { err: String(err) });
    process.exit(1);
  });
