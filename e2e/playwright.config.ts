import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

// Locally the seed users come from the root .env file; in CI from the workflow env.
const envFile = path.resolve(__dirname, "../.env");
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
}

// Windows on Samuele's PC blocks 5173, so locally: $env:E2E_PORT=3000
const port = Number(process.env.E2E_PORT ?? 5173);

export default defineConfig({
    testDir: "./tests",
    // One worker: the tests share the same database.
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: `http://localhost:${port}`,
        trace: "retain-on-failure"
    },
    // Starts the React client; the API must already run (Docker) on port 5033.
    webServer: {
        command: `npm run dev -- --port ${port} --strictPort`,
        cwd: path.resolve(__dirname, "../Frontend"),
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI
    }
});
