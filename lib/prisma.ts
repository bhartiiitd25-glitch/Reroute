import { PrismaClient } from "@prisma/client";

/**
 * Global Prisma client instance to prevent multiple instances in development
 * due to hot reloading. In production, creates a single instance.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

