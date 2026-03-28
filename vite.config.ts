import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // 同一LANのiPhone等から `http://<PCのIP>:5173` で参照するため（既定は localhost のみ）
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg", "vite.svg"],
      manifest: {
        name: "家計簿",
        short_name: "家計簿",
        description: "家計の収支を記録・共有します。",
        theme_color: "#0f766e",
        background_color: "#0c0f0e",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "browser"],
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "ja",
        dir: "ltr",
        categories: ["finance", "lifestyle"],
        icons: [
          {
            src: "pwa-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "ホーム",
            short_name: "ホーム",
            description: "収支一覧とホーム",
            url: "/",
            icons: [
              {
                src: "pwa-icon.svg",
                sizes: "512x512",
                type: "image/svg+xml",
              },
            ],
          },
          {
            name: "収支を登録",
            short_name: "登録",
            description: "新しい収支を登録",
            url: "/transactions/new",
            icons: [
              {
                src: "pwa-icon.svg",
                sizes: "512x512",
                type: "image/svg+xml",
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: true,
        navigateFallback: "index.html",
      },
    }),
  ],
});
