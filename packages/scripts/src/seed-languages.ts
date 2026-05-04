import { createDatabaseClient } from "../../db/src/client";
import { learningLanguages } from "../../db/src/schema";
import { eq } from "drizzle-orm";

const LANGUAGES = [{ id: "vi", code: "vi", name: "Vietnamese" }];

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is required");
    }

    const database = createDatabaseClient(databaseUrl);

    for (const language of LANGUAGES) {
        const [existing] = await database.select().from(learningLanguages).where(eq(learningLanguages.code, language.code)).limit(1);

        if (existing) {
            console.log(`Language already exists: ${language.name} (${language.code})`);
            continue;
        }

        await database.insert(learningLanguages).values(language);
        console.log(`Seeded language: ${language.name} (${language.code})`);
    }
}

await main();
