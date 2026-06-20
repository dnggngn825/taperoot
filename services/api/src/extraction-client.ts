import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

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

export interface ExtractedNote {
  convo_id: string;
  text: string;
  date: string;
}

export interface ExtractedAction {
  description: string;
  due_date: string;
  source_type: string;
  source_id: string;
}

export interface GenerateRequest {
  contact_id: string;
  context: {
    name: string;
    company: string;
    role: string;
    notes: { id: string; body: string; note_date: string }[];
    conversations: { id: string; convo_date: string; summary: string; transcript: string }[];
  };
}

export interface GenerateResponse {
  notes: ExtractedNote[];
  actions: ExtractedAction[];
}

export interface ExtractionClient {
  generate(req: GenerateRequest): Promise<GenerateResponse>;
}

export function createExtractionClient(): ExtractionClient {
  const addr = process.env.EXTRACTION_ADDR ?? 'localhost:50051';
  const grpcClient = new proto.extraction.v1.ExtractionService(
    addr,
    grpc.credentials.createInsecure(),
  );

  return {
    generate(req: GenerateRequest): Promise<GenerateResponse> {
      return new Promise((resolve, reject) => {
        grpcClient.generateForContact(req, (err: Error | null, res: GenerateResponse) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    },
  };
}
