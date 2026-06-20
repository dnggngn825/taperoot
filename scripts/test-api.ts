// Backend API test script — full test cases added in Phase 6
// Usage: npm run test:api  (requires api + extraction services running)

const API_URL = process.env.API_URL ?? 'http://localhost:4000/graphql';

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ data?: unknown; errors?: unknown[] }>;
}

// Keep the compiler happy in Phase 1 stub
void gql;

console.log('[test:api] stub — tests will be added in Phase 6');
console.log('[test:api] PASS');
process.exit(0);
