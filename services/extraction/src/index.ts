const addr = process.env.EXTRACTION_ADDR ?? 'localhost:50051';

console.log(`[extraction] gRPC stub ready`);
console.log(`[extraction] addr: ${addr}`);
console.log(`[extraction] Real gRPC server will be wired in Phase 3`);

// Keep process alive — real gRPC server replaces this in Phase 3
setInterval(() => {}, 2_147_483_647);
