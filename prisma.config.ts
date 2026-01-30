// Prisma 7 configuration file
// This file is needed for migrations but should NOT be deployed to production
// The Dockerfile excludes this file from the production image
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
