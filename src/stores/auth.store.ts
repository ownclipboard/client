import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { $localStorage, $sessionStorage } from "./native";
import { type SubStat } from "../types/models.types";

export type AuthUser = {
  email?: string;
  username: string;
  plan?: "free" | "pro";
};


export const useAuthUser = defineStore("authUser", () => {
  const data = ref<AuthUser>();
  const isLogged = computed(() => !!data.value);
  const subscription = ref<SubStat>();


  function signOut() {
    $localStorage.remove("token");
    $localStorage.remove("tabs");
    $sessionStorage.remove("currentTab");

    window.location.href = "/";
  }

  return { data, isLogged, subscription, signOut };
});

export type AuthUserStore = ReturnType<typeof useAuthUser>;