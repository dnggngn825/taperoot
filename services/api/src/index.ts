import http from 'node:http';
import { createYoga } from 'graphql-yoga';
import { buildSchema } from './schema/index.js';

const port = Number(process.env.API_PORT ?? 4000);
const schema = buildSchema();

const yoga = createYoga({ schema });

const server = http.createServer(yoga);

server.listen(port, () => {
  console.log(`[api] GraphQL server listening on :${port}`);
  console.log(`[api] GraphiQL → http://localhost:${port}/graphql`);
});
