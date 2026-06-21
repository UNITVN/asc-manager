import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverPort = env.SERVER_PORT || 3001;
  const unitAuth = env.VITE_UNIT_AUTH === "true";
  const apiTarget = `http://localhost:${serverPort}`;

  const dirName = path.basename(process.cwd());
  const isMainWorktree = dirName === "app-store-manager";
  const defaultTitle = isMainWorktree ? "ASC Manager" : `ASC Manager \u2014 ${dirName}`;
  const appTitle = env.VITE_APP_TITLE || defaultTitle;

  const unitAuthPlugin = unitAuth
    ? {
        name: "inject-unit-auth",
        transformIndexHtml(html) {
          return html.replace(
            "</head>",
            '  <script src="/auth.js"></script>\n  </head>'
          );
        },
      }
    : null;

  return {
    plugins: [react(), tailwindcss(), unitAuthPlugin].filter(Boolean),
    define: {
      __APP_TITLE__: JSON.stringify(appTitle),
    },
    appType: "spa",
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.js"],
    },
    server: {
      port: parseInt(env.PORT || "5173"),
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        ...(unitAuth
          ? {
              "/login": { target: apiTarget, changeOrigin: true },
              "/auth.js": { target: apiTarget, changeOrigin: true },
              "/admin": { target: apiTarget, changeOrigin: true },
            }
          : {}),
      },
    },
  };
});
