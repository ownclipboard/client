import { $http, setAuthToken } from "../http";
import type { AuthUser, AuthUserStore, StorageSummary } from "../stores/auth.store";
import type { SubStat } from "../types/models.types";
import type { components } from "../types/api";
import { $localStorage } from "../stores/native";

type PingResponse = {
  /** Null when the token no longer identifies anyone. */
  user: AuthUser | null;
  storage: StorageSummary;
  realtime: components["schemas"]["RealtimeSummary"];
  subscription: SubStat;
};

/**
 * `ok` the session stands, `signed-out` it is gone and the sign-in page is
 * already being loaded, `unreachable` the api never answered so nothing can be
 * concluded about the session.
 */
export type AuthRefresh = "ok" | "signed-out" | "unreachable";

export async function refreshAuthData(st: AuthUserStore): Promise<AuthRefresh> {
  // No token means signed out, and no api is needed to know it. Asking anyway
  // would strand the browser on a network error while the answer is already in.
  if (!$localStorage.get("token")) {
    st.clearSession();
    return "signed-out";
  }

  try {
    const { user, storage, realtime, subscription } = await $http.get<any, PingResponse>("/ping");

    // A null user is a 200 that still means signed out. Without this the app
    // sits on its loading screen with no session and no way out of it.
    if (!user) {
      st.clearSession();
      return "signed-out";
    }

    st.data = user;
    st.storage = storage;
    st.realtime = realtime;
    st.subscription = subscription;
    return "ok";
  } catch (e: any) {
    // Only an answer from the api says the session is gone. A request that
    // never arrived says nothing, so the token is kept and the caller decides.
    if (!e?.response) return "unreachable";
    st.clearSession();
    return "signed-out";
  }
}

/**
 * End the session server side. The jwt carries a login token that the API
 * replaces here, so every token issued so far stops working, on every device.
 */
export function logout() {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/auth/logout");
}

/**
 * Add an email to the account or replace the one it has. The account password is
 * required because this address is where a password reset would be sent.
 */
/**
 * Ask for a reset code. The answer is the same whatever address is given, so it
 * cannot be used to find out who has an account.
 */
export function forgotPassword(email: string) {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/auth/forgot-password", { email }, { timeout: 30_000 });
}

/** Set a new password with the emailed code. Every session ends, so sign in again. */
export function resetPassword(email: string, code: string, newPassword: string) {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/auth/reset-password", { email, code, newPassword });
}

/** Email a fresh verification code to the address on the account. */
export function sendEmailVerification() {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/account/send-verification", undefined, {
    timeout: 30_000
  });
}

/** Confirm the address with the code from the email. */
export function verifyEmail(code: string) {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/account/verify-email", { code });
}

export function setAccountEmail(email: string, password: string) {
  return $http.post<any, components["schemas"]["SetEmailResponse"]>("/account/set-email", { email, password });
}

/**
 * Replace the account password. Every other session ends, and the caller is
 * handed a fresh token that has to replace the stored one.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await $http.post<any, components["schemas"]["ChangePasswordResponse"]>("/account/change-password", {
    currentPassword,
    newPassword
  });
  setAuthToken(res.token);
  return res;
}

/**
 * Close the account. Every session ends, but nothing is deleted yet: signing in
 * again within the grace period reopens it, and after that it all goes.
 */
export function closeAccount(password: string) {
  return $http.post<any, components["schemas"]["CloseAccountResponse"]>(
    "/account/close",
    { password },
    { timeout: 30_000 }
  );
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
