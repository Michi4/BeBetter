const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__bebetter_prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.__bebetter_prisma = prisma;

module.exports = prisma;
