import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

config();

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle({ client: sql });

export * from "@/db/auth-schema";
export * from "@/db/schema";