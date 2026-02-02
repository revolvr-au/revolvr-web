import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    // Used by prisma migrate/dev/deploy
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  db: {
    // Used by prisma generate / client
    url: process.env.DATABASE_URL,
  },
});
