import { promises as fileSystem } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PackageJson = {
    name: string;
    scripts?: Record<string, string>;
};

type TurboJson = {
    tasks: Record<string, unknown>;
};

const workspaceDirectories = ["apps", "packages", "tools"] as const;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, "../../..");
const rootPackageJsonPath = path.join(repositoryRoot, "package.json");
const turboJsonPath = path.join(repositoryRoot, "turbo.json");

async function readJsonFile(filePath: string): Promise<PackageJson> {
    const fileContents = await fileSystem.readFile(filePath, "utf8");
    return JSON.parse(fileContents) as PackageJson;
}

async function getWorkspacePackageJsonPaths(): Promise<string[]> {
    const workspacePackageJsonPaths: string[] = [];

    for (const workspaceDirectory of workspaceDirectories) {
        const absoluteWorkspaceDirectory = path.join(repositoryRoot, workspaceDirectory);
        const workspaceEntries = await fileSystem.readdir(absoluteWorkspaceDirectory, {
            withFileTypes: true,
        });

        for (const workspaceEntry of workspaceEntries) {
            if (!workspaceEntry.isDirectory()) {
                continue;
            }

            workspacePackageJsonPaths.push(path.join(absoluteWorkspaceDirectory, workspaceEntry.name, "package.json"));
        }
    }

    return workspacePackageJsonPaths;
}

async function getTurboTaskNames(): Promise<Set<string>> {
    const turboJsonContents = await fileSystem.readFile(turboJsonPath, "utf8");
    const turboJson = JSON.parse(turboJsonContents) as TurboJson;

    return new Set(Object.keys(turboJson.tasks ?? {}));
}

function getWorkspaceAlias(workspacePackageName: string, workspacePackageJsonPath: string): string {
    if (workspacePackageName.startsWith("@plearn/")) {
        return workspacePackageName.replace("@plearn/", "");
    }

    return path.basename(path.dirname(workspacePackageJsonPath));
}

function getRootScriptName(workspaceAlias: string, workspaceScriptName: string): string {
    if (workspaceScriptName.startsWith(`${workspaceAlias}:`)) {
        return workspaceScriptName;
    }

    return `${workspaceAlias}:${workspaceScriptName}`;
}

async function main(): Promise<void> {
    const rootPackageJson = await readJsonFile(rootPackageJsonPath);
    const turboTaskNames = await getTurboTaskNames();
    const generatedRootScripts: Record<string, string> = {};
    const workspacePackageJsonPaths = await getWorkspacePackageJsonPaths();

    for (const workspacePackageJsonPath of workspacePackageJsonPaths.sort()) {
        const workspacePackageJson = await readJsonFile(workspacePackageJsonPath);
        const workspaceScripts = workspacePackageJson.scripts ?? {};

        if (!workspacePackageJson.name) {
            throw new Error(`Workspace package at "${workspacePackageJsonPath}" is missing a name.`);
        }

        const workspaceAlias = getWorkspaceAlias(workspacePackageJson.name, workspacePackageJsonPath);

        for (const workspaceScriptName of Object.keys(workspaceScripts).sort()) {
            if (turboTaskNames.has(workspaceScriptName)) {
                continue;
            }

            const rootScriptName = getRootScriptName(workspaceAlias, workspaceScriptName);

            if (generatedRootScripts[rootScriptName]) {
                throw new Error(`Cannot generate root script "${rootScriptName}" because another workspace already uses that alias.`);
            }

            generatedRootScripts[rootScriptName] = `pnpm --filter ${workspacePackageJson.name} run ${workspaceScriptName}`;
        }
    }

    rootPackageJson.scripts = {
        ...(rootPackageJson.scripts ?? {}),
        ...generatedRootScripts,
    };

    await fileSystem.writeFile(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`, "utf8");

    console.log(`Synced ${Object.keys(generatedRootScripts).length} workspace root scripts into package.json.`);
}

await main();
