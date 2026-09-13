import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { isDev } from "./config";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/400-italic.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "./styles/tokens.css";
import "./tailwind.css";
import "./styles/base.css";

import LoadingButton from "revue-components/vues/LoadingButton.vue";
import TimeAgo from "revue-components/vues/TimeAgoLite.vue";
import Toaster from "./components/ui/Toaster.vue";

// Applies the `dark` class to <html> and keeps it in sync with the preference.
import "./stores/theme.store";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.component("LoadingButton", LoadingButton);
app.component("TimeAgo", TimeAgo);
app.component("Toaster", Toaster);

async function bootstrap() {
  if (isDev) {
    // Debug dock only in development builds. Registers <DebugDock /> and <debug />.
    const [{ useDebugPlugin }, { default: RouterInfo }, { default: ScreenSize }] = await Promise.all([
      import("vue-json-debug/src/plugin"),
      import("vue-json-debug/src/docks/RouterInfo.vue"),
      import("vue-json-debug/src/docks/ScreenSize.vue"),
      import("vue-json-debug/src/debug.css")
    ]);
    useDebugPlugin(app, {
      registerDebugComponent: true,
      dock: { hideIfNoSlots: false },
      components: { after: { RouterInfo, ScreenSize } }
    });
  }

  app.mount("#app");
}

bootstrap();
