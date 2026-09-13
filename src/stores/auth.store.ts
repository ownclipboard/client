import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { $localStorage, $sessionStorage } from "./native";
import { type SubStat } from "../types/models.types";
import { askToConfirm } from "../components/ConfirmHandler";
import { logout } from "../services/auth.service";

export type AuthUser = {
  email?: string;
  username: string;
  plan?: "free" | "pro";
};


export const useAuthUser = defineStore("authUser", () => {
  const data = ref<AuthUser>();
  const isLogged = computed(() => !!data.value);
  const subscription = ref<SubStat>();
  // Pending (unpaid) subscriptions, newest first. Filled by the Pricing page.
  const pending = ref<SubStat[]>([]);

  /** Drop this browser's session and go back to the sign-in page. */
  function clearSession() {
    $localStorage.remove("token");
    $localStorage.remove("tabs");
    $sessionStorage.remove("currentTab");

    window.location.href = "/";
  }

  /**
   * The API has a single logout endpoint and it ends every session of the
   * account, so say so before calling it. Takes the LoadingButton when one
   * invoked it, to release it if the user backs out.
   */
  async function signOut(btn?: { stopLoading?: () => void }) {
    const ok = await askToConfirm({
      title: "Sign out?",
      message: "This ends your session everywhere you are signed in, not just in this browser.",
      confirmLabel: "Sign out",
      danger: true
    });

    if (!ok) return btn?.stopLoading?.();

    try {
      await logout();
    } catch {
      // An expired or already ended session still means signing out here.
    }

    clearSession();
  }

  return { data, isLogged, subscription, pending, clearSession, signOut };
});

export type AuthUserStore = ReturnType<typeof useAuthUser>;
