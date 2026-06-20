import http from 'node:http';
import { createYoga } from 'graphql-yoga';
import { buildSchema } from './schema/index.js';

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

server.listen(port, () => {
  console.log(`[api] GraphQL server listening on :${port}`);
  console.log(`[api] GraphiQL → http://localhost:${port}/graphql`);
});
