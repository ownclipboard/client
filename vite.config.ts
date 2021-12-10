import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { ViteEjsPlugin } from "vite-plugin-ejs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ViteEjsPlugin((config) => {
      return {
        config: {
          name: config.env.VITE_APP_NAME || "Ownclipboard Client",
          useCdnForExternalScripts:
            config.env.VITE_APP_USE_CDN_FOR_EXTERNAL_SCRIPTS || config.isProduction
        }
      };
    })
  ]
});
