import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { $localStorage, $sessionStorage } from "./native";
import { type SubStat } from "../types/models.types";
import type { components } from "../types/api";
import { askToConfirm } from "../components/ConfirmHandler";
import { logout, logoutEverywhere } from "../services/auth.service";

export type AuthUser = {
  email?: string;
  /** Only a confirmed address can reset the password, so the app nags until it is. */
  emailVerified?: boolean;
  username: string;
  plan?: "free" | "pro";
};

/** What `ping` reports about the account's file storage. */
export type StorageSummary = components["schemas"]["StorageSummary"];


export const useAuthUser = defineStore("authUser", () => {
  const data = ref<AuthUser>();
  const isLogged = computed(() => !!data.value);
  const subscription = ref<SubStat>();
  // Pending (unpaid) subscriptions, newest first. Filled by the Pricing page.
  const pending = ref<SubStat[]>([]);

  // Where files go. Filled by `ping`, and kept in step by the Settings page.
  const storage = ref<StorageSummary>();

  /** Whether this server offers live updates, and the channel to listen on. */
  const realtime = ref<components["schemas"]["RealtimeSummary"]>();

  /** Files can only be uploaded once storage is connected and usable. */
  const canUpload = computed(() => !!storage.value?.connected);

  /** Why uploading is unavailable. Callers add the pointer to settings if they are not already sending the user there. */
  const uploadBlockedReason = computed(() => {
    if (canUpload.value) return "";
    if (storage.value?.proRequired) return "Uploads are paused because your Pro plan ended.";
    return "File storage is not connected yet.";
  });

  /** Drop this browser's session and go back to the sign-in page. */
  function clearSession() {
    $localStorage.remove("token");
    $localStorage.remove("tabs");
    $sessionStorage.remove("currentTab");

    window.location.href = "/";
  }

  /**
   * Signs out this device alone; the account's others carry on. Asking first
   * would be noise for something that undoes itself with one sign-in.
   */
  async function signOut(btn?: { stopLoading?: () => void }) {
    try {
      await logout();
    } catch {
      // An expired or already ended session still means signing out here.
    } finally {
      btn?.stopLoading?.();
    }

    clearSession();
  }

  /**
   * The lost-device button. This one does deserve a confirmation, because it
   * reaches every other device the account is signed in on.
   */
  async function signOutEverywhere(btn?: { stopLoading?: () => void }) {
    const ok = await askToConfirm({
      title: "Sign out everywhere?",
      message: "Every device signed in to this account is signed out, including this one.",
      confirmLabel: "Sign out everywhere",
      danger: true
    });

    if (!ok) return btn?.stopLoading?.();

    try {
      await logoutEverywhere();
    } catch {
      // Whatever the server said, this browser is not staying signed in.
    }

    clearSession();
  }

  return { data, isLogged, subscription, pending, storage, realtime, canUpload, uploadBlockedReason, clearSession, signOut, signOutEverywhere };
});

export type AuthUserStore = ReturnType<typeof useAuthUser>;
