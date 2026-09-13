import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Index from "./views/Index.vue";
import AuthLayout from "./views/AuthLayout.vue";

const routes: Array<RouteRecordRaw> = [
  { path: "/", name: "index", component: Index, meta: { title: "Sign in" } },
  { path: "/signup", name: "signup", component: () => import("./views/Signup.vue"), meta: { title: "Create account" } },

  {
    path: "/paste/:pasteId",
    name: "public-paste",
    component: () => import("./views/PublicPaste.vue")
  },

  {
    path: "/",
    component: AuthLayout,
    children: [
      { path: "clipboard", name: "clipboard", component: () => import("./views/Clipboard.vue"), meta: { title: "Clipboard" } },
      { path: "pricing", name: "pricing", component: () => import("./views/Pricing.vue"), meta: { title: "Plan" } },
      { path: "settings", name: "settings", component: () => import("./views/Settings.vue"), meta: { title: "Settings" } }
    ]
  },

  { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("./views/NotFound.vue"), meta: { title: "Not found" } }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
