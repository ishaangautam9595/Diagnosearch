import { config } from "dotenv";
// Tests always run against the dedicated test database.
config({ path: ".env.test", override: true });
if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("Refusing to run tests against a non-test database");
