import fs from "node:fs";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

function readDashboardVersion(): string {
    try {
        const raw = fs.readFileSync(new URL("./deno.json", import.meta.url), "utf-8");
        const parsed = JSON.parse(raw) as { version?: string };
        return parsed.version || "1.0.0";
    } catch {
        return "1.0.0";
    }
}

export default defineConfig({
    plugins: [vue()],
    define: {
        __DASHBOARD_VERSION__: JSON.stringify(readDashboardVersion()),
    },
    server: {
        port: 5173,
        host: "0.0.0.0",
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
            "/ws": {
                target: "ws://localhost:3000",
                ws: true,
            },
        },
    },
});
