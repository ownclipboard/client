import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import "./tailwind.css";
import "./assets/scss/main.scss";
import "./components/paginator/Paginator.scss";
import "vue-json-debug/src/debug.css";

import LoadingButton from "revue-components/vues/LoadingButton.vue";
import WsAlert from "./components/ws-alert/WsAlert.vue";
import TimeAgo from "revue-components/vues/TimeAgoLite.vue";
import PasswordPrompt from "./components/PasswordPrompt.vue";
import { createPinia } from "pinia";
import { useDebugPlugin } from "vue-json-debug/src/plugin";
import RouterInfo from "vue-json-debug/src/docks/RouterInfo.vue";
import ScreenSize from "vue-json-debug/src/docks/ScreenSize.vue";


const pinia = createPinia();
const app = createApp(App);


app.use(pinia);
app.use(router);

useDebugPlugin(app, {
  registerDebugComponent: true,

  dock: { hideIfNoSlots: false },

  components: {
    after: { RouterInfo, ScreenSize }
  }
});


app.component("LoadingButton", LoadingButton);
app.component("WsAlert", WsAlert);
app.component("TimeAgo", TimeAgo);
app.component("PasswordPrompt", PasswordPrompt);

app.mount("#app");
