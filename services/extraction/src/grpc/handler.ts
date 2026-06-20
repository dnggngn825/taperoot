import * as grpc from '@grpc/grpc-js';
import type {
  Extractor,
  GenerateForContactRequest,
  GenerateForContactResponse,
} from '../types.js';

export function makeGenerateForContactHandler(extractor: Extractor) {
  return async function generateForContact(
    call: grpc.ServerUnaryCall<GenerateForContactRequest, GenerateForContactResponse>,
    callback: grpc.sendUnaryData<GenerateForContactResponse>,
  ): Promise<void> {
    try {
      const result = await extractor.generate(call.request.context);
      callback(null, result);
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: (err as Error).message });
    }
  };
}
