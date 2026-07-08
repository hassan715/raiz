import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from 'child_process';

const host = process.env.TAURI_DEV_HOST;

// 1. Get the current app version from package.json (e.g., "0.1.0" or "8.12.12")
const appVersion = process.env.npm_package_version || "0.1.0";
const [major, minor, patch] = appVersion.split('.');

// 2. Get the total Git commit count (e.g., "44")
let commitCount = "000";
try {
  commitCount = execSync('git rev-list --count HEAD').toString().trim();
} catch (e) {
  console.warn("Git history not found.");
}

// 3. Format exactly like 1Password:
// Major (1 digit) + Minor (2 digits) + Patch (2 digits) + Commits (3+ digits)
// Example: 8.12.12 with 44 commits -> 8 + 12 + 12 + 044 -> "81212044"
const formattedMinor = minor.padStart(2, '0');
const formattedPatch = patch.padStart(2, '0');
const formattedCommits = commitCount.padStart(3, '0');

const numericBuildId = `${major}${formattedMinor}${formattedPatch}${formattedCommits}`;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  define: {
    // This makes a global variable available in your React code
    __APP_COMMIT_HASH__: JSON.stringify(numericBuildId),
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
