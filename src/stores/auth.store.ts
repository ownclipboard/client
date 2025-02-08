import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

export type AuthUser = {
  email?: string;
  username: string;
  plan?: "free" | "pro";
};

export const authUser = reactive<AuthUser>({
  username: ""
});


export const useAuthUser = defineStore("authUser", () => {
  const data = ref<AuthUser>();
  const isLogged = computed(() => !!data.value);

  return { data, isLogged };
});

export type AuthUserStore = ReturnType<typeof useAuthUser>;