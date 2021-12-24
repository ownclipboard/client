import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { ViteEjsPlugin } from "vite-plugin-ejs";

// https://vitejs.dev/config/
export default defineConfig({

  plugins: [
    vue(),
    ViteEjsPlugin((config) => {
      // Use Cdn for external scripts
      const useCdnForExternalScripts =
        config.env.VITE_APP_USE_CDN_FOR_EXTERNAL_SCRIPTS === "true" ||
        config.isProduction;

      // Get App Name.
      const name = config.env.VITE_APP_NAME || "Ownclipboard Client";

      // Get Config.
      return {
        config: {
          name,
          useCdnForExternalScripts
        }
      };
    })
  ]
});
