import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    db: {
      url: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
    },
  },
});
