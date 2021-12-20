import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./tailwind.css";
import "./assets/scss/main.scss";

const app = createApp(App);

app.use(router);

import LoadingButton from "revue-components/vues/LoadingButton.vue";
import WsAlert from "./components/ws-alert/WsAlert.vue";
import TimeAgo from "revue-components/vues/TimeAgoLite.vue";
import PasswordPrompt from "./components/PasswordPrompt.vue";

app.component("LoadingButton", LoadingButton);
app.component("WsAlert", WsAlert);
app.component("TimeAgo", TimeAgo);
app.component("PasswordPrompt", PasswordPrompt);

app.mount("#app");
