import { createAuth } from "../../auth/src/server";
import { createDatabaseClient } from "../../db/src/client";
import { users } from "../../db/src/schema";
import { eq } from "drizzle-orm";

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    const baseUrl = process.env.BETTER_AUTH_URL;
    const authSecret = process.env.BETTER_AUTH_SECRET;
    const ownerEmail = process.env.PLEARN_OWNER_EMAIL;
    const ownerName = process.env.PLEARN_OWNER_NAME;
    const ownerPassword = process.env.PLEARN_OWNER_PASSWORD;

    if (!databaseUrl || !baseUrl || !authSecret || !ownerEmail || !ownerName || !ownerPassword) {
        throw new Error(
            "DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET, PLEARN_OWNER_EMAIL, PLEARN_OWNER_NAME, and PLEARN_OWNER_PASSWORD are required",
        );
    }

    const database = createDatabaseClient(databaseUrl);
    const auth = createAuth({
        webUrl: new URL(baseUrl),
        serverUrl: new URL(baseUrl),
        apiPath: "/api",
        authSecret,
        db: database,
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });

    const [existingUser] = await database.select().from(users).where(eq(users.email, ownerEmail)).limit(1);

    if (existingUser) {
        console.log(`Owner already exists for ${existingUser.email}`);

        return;
    }

    const session = await auth.api.signUpEmail({
        body: {
            email: ownerEmail,
            name: ownerName,
            password: ownerPassword,
        },
    });

    console.log(`Owner bootstrap complete for ${session.user.email}`);
}

await main();
