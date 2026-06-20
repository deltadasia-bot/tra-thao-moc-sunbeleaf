import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    root: "./src",
    base: "",
    plugins: [zaloMiniApp(), react()],
    build: {
      assetsInlineLimit: 0,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: "assets/app.module.js",
          chunkFileNames: "assets/[name].[hash].module.js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith(".css")) {
              return "assets/app.css";
            }

            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  });
};
