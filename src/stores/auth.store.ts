import { reactive } from "vue";

export type authUser = {
  email?: string;
  username: string;
  plan?: "free" | "pro";
};

export const authUser = reactive<authUser>({
  username: ""
});
