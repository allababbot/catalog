import { cp, mkdir, rm, stat } from "node:fs/promises";

await mkdir("dist", { recursive: true });

// Only copy if the public folder exists
const publicExists = await stat("public").then(() => true).catch(() => false);
if (publicExists) {
    await rm("dist/public", { recursive: true, force: true });
    await cp("public", "dist/public", { recursive: true });
}
