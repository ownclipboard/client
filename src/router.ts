import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Index from "./views/Index.vue";
import AuthLayout from "./views/AuthLayout.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "index",
    component: Index
  },

  {
    path: "/paste/:pasteId",
    name: "public-paste",
    component: () => import("./views/PublicPaste.vue")
  },

  {
    path: "/",
    component: AuthLayout,
    children: [
      {
        path: "clipboard",
        name: "clipboard",
        component: () => import("./views/Clipboard.vue")
      },

      {
        name: "pricing",
        path: "pricing",
        component: () => import("./views/Pricing.vue")
      }
    ]
  },


];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
