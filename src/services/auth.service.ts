import { $http } from "../http";
import type { AuthUser, AuthUserStore, StorageSummary } from "../stores/auth.store";
import type { SubStat } from "../types/models.types";
import type { components } from "../types/api";
import { $localStorage } from "../stores/native";

type PingResponse = { user: AuthUser; storage: StorageSummary; subscription: SubStat };

export async function refreshAuthData(st: AuthUserStore) {
  try {
    const { user, storage, subscription } = await $http.get<any, PingResponse>("/ping");
    st.data = user;
    st.storage = storage;
    st.subscription = subscription;
  } catch {
    // The token is no longer good, so there is no session left to end server side.
    st.clearSession();
  }
}

/**
 * End the session server side. The jwt carries a login token that the API
 * replaces here, so every token issued so far stops working, on every device.
 */
export function logout() {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/auth/logout", undefined, { timeout: 10_000 });
}

/** Whether a username is already taken. */
export async function usernameExists(username: string) {
  const res = await $http.post<any, components["schemas"]["CheckUsernameResponse"]>("/auth/check-username", { username });
  return !!res.exists;
}

/** Log in and store the token. Returns the user's plan (null when none chosen yet). */
export async function login(username: string, password: string) {
  const res = await $http.post<any, components["schemas"]["LoginResponse"]>("/auth/login", { username, password });
  $localStorage.set("token", res.token);
  return res.plan;
}

/** Create an account. Email is optional and only used for password resets. The caller logs in afterwards. */
export function signup(username: string, password: string, email?: string) {
  const body: components["schemas"]["SignupBody"] = { username, password };
  if (email) body.email = email;
  return $http.post<any, components["schemas"]["MessageResponse"]>("/auth/signup", body);
}
