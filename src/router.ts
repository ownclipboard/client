import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Index from "./views/Index.vue";
import AuthLayout from "./views/AuthLayout.vue";
import { $localStorage } from "./stores/native";

const routes: Array<RouteRecordRaw> = [
  { path: "/", name: "index", component: Index, meta: { title: "Sign in" } },
  { path: "/signup", name: "signup", component: () => import("./views/Signup.vue"), meta: { title: "Create account" } },

  {
    path: "/paste/:pasteId",
    name: "public-paste",
    component: () => import("./views/PublicPaste.vue")
  },

  // Reachable without an account: app stores require the first three, and the
  // mobile app sends people here to read about Pro.
  { path: "/privacy", name: "privacy", component: () => import("./views/legal/Privacy.vue"), meta: { title: "Privacy policy" } },
  { path: "/terms", name: "terms", component: () => import("./views/legal/Terms.vue"), meta: { title: "Terms of service" } },
  { path: "/support", name: "support", component: () => import("./views/legal/Support.vue"), meta: { title: "Support" } },
  {
    path: "/pricing",
    name: "public-pricing",
    component: () => import("./views/PublicPricing.vue"),
    meta: { title: "Plans" },
    // Someone already signed in wants the page that manages their subscription.
    beforeEnter: () => ($localStorage.get("token") ? { name: "pricing" } : true)
  },

  {
    path: "/",
    component: AuthLayout,
    children: [
      { path: "clipboard", name: "clipboard", component: () => import("./views/Clipboard.vue"), meta: { title: "Clipboard" } },
      { path: "files", name: "files", component: () => import("./views/Files.vue"), meta: { title: "Files" } },
      { path: "spaces", name: "spaces", component: () => import("./views/Spaces.vue"), meta: { title: "Spaces" } },
      { path: "spaces/:spaceId", name: "space", component: () => import("./views/Space.vue"), meta: { title: "Space" } },
      { path: "devices", name: "devices", component: () => import("./views/Devices.vue"), meta: { title: "Devices" } },
      { path: "plan", name: "pricing", component: () => import("./views/Pricing.vue"), meta: { title: "Plan" } },
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
