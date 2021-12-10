import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { ViteEjsPlugin } from "vite-plugin-ejs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ViteEjsPlugin((config) => {
      const useCdnForExternalScripts =
        config.env.VITE_APP_USE_CDN_FOR_EXTERNAL_SCRIPTS === "true" ||
        config.isProduction;

      const name = config.env.VITE_APP_NAME || "Ownclipboard Client";

      return {
        config: {
          name,
          useCdnForExternalScripts
        }
      };
    })
  ]
});
