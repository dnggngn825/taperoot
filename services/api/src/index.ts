import http from 'node:http';

const port = Number(process.env.API_PORT ?? 4000);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'api' }));
    return;
  }
  res.writeHead(404).end();
});

server.listen(port, () => {
  console.log(`[api] stub listening on :${port}`);
  console.log(`[api] GraphQL API will be wired in Phase 5`);
});
