import * as schema from "./schema";
import { neon } from "@neondatabase/serverless";
import { drizzle as neonDrizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as pgDrizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

export type DatabaseInstance = NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>;

export function createDatabaseClient(databaseUrl: string): DatabaseInstance {
    const isLocalDatabase = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

    if (isLocalDatabase) {
        return pgDrizzle(databaseUrl, { schema, logger: true });
    }

    return neonDrizzle(neon(databaseUrl), { schema });
}
