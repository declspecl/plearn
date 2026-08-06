import process from "node:process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}

const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();
try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    console.info("PostgreSQL extensions ready: vector, pg_trgm");
} finally {
    await client.end();
}
