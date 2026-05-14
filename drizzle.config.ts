import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/auth-schema.ts"],
  out: "./drizzle/migrations",
  dialect: "sqlite",
});
