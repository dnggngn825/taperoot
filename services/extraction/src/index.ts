import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { ContactContext } from './types.js';
import { MockExtractor } from './mock-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.resolve(__dirname, '../../../proto/extraction.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = grpc.loadPackageDefinition(packageDef) as any;
const ExtractionService = proto.extraction.v1.ExtractionService;

const extractor = new MockExtractor();

async function generateForContact(
  call: grpc.ServerUnaryCall<{ contact_id: string; context: ContactContext }, unknown>,
  callback: grpc.sendUnaryData<unknown>,
) {
  try {
    const ctx = call.request.context as ContactContext;
    const result = await extractor.generate(ctx);
    callback(null, result);
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: (err as Error).message,
    });
  }
}

const port = process.env.EXTRACTION_PORT ?? '50051';
const addr = `0.0.0.0:${port}`;

const server = new grpc.Server();
server.addService(ExtractionService.service, { generateForContact });

server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
  if (err) {
    console.error('[extraction] failed to bind:', err.message);
    process.exit(1);
  }
  console.log(`[extraction] gRPC server listening :${boundPort}`);
  console.log(`[extraction] extractor: MockExtractor (keyless)`);
});
