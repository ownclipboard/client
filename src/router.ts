import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Index from "./views/Index.vue";
import Authenticated from "./views/Authenticated.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "index",
    component: Index
  },

  {
    path: "/",
    component: Authenticated,
    children: [
      {
        path: "clipboard",
        name: "clipboard",
        component: () => import("./views/Clipboard.vue")
      },
    ]
  },
  
  {
    path: "/paste/:pasteId",
    name: "public-paste",
    component: () => import("./views/PublicPaste.vue")
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
