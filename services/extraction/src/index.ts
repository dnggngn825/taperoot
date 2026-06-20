import * as grpc from '@grpc/grpc-js';
import { ExtractionService } from './grpc/proto.js';
import { createExtractor } from './extractors/extractor-factory.js';
import { makeGenerateForContactHandler } from './grpc/handler.js';

const extractor = createExtractor();

const port = process.env.EXTRACTION_PORT ?? '50051';
const addr = `0.0.0.0:${port}`;

const server = new grpc.Server();
server.addService(ExtractionService.service, {
  generateForContact: makeGenerateForContactHandler(extractor),
});

server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
  if (err) {
    console.error('[extraction] failed to bind:', err.message);
    process.exit(1);
  }
  console.log(`[extraction] gRPC server listening :${boundPort}`);
});
