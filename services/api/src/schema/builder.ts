import SchemaBuilder from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import { Prisma } from '@prisma/client';
import type PrismaTypes from '../generated/pothos-types.js';
import { prisma } from '../db.js';

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes;
}>({
  plugins: [PrismaPlugin],
  prisma: {
    client: prisma,
    dmmf: Prisma.dmmf,
    exposeDescriptions: false,
    filterConnectionTotalCount: false,
  },
});

builder.queryType({});
builder.mutationType({});

export function buildSchema() {
  return builder.toSchema();
}
