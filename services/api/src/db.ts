import { PrismaClient } from '@prisma/client';

// Singleton — shared across the whole API process
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});
