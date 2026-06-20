import { createClient, cacheExchange, fetchExchange } from 'urql';

export const client = createClient({
  url: (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? 'http://localhost:4000/graphql',
  exchanges: [cacheExchange, fetchExchange],
});
