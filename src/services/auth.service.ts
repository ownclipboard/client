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
  twoFactor: components["schemas"]["TwoFactorSummary"];
  trial: components["schemas"]["TrialSummary"];
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
    const { user, storage, realtime, twoFactor, trial, subscription } = await $http.get<any, PingResponse>("/ping");

    // A null user is a 200 that still means signed out. Without this the app
    // sits on its loading screen with no session and no way out of it.
    if (!user) {
      st.clearSession();
      return "signed-out";
    }

    st.data = user;
    st.storage = storage;
    st.realtime = realtime;
    st.twoFactor = twoFactor;
    st.trial = trial;
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

/** Ends every session of the account, this one included. For a lost device. */
export function logoutEverywhere() {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/auth/logout-all", undefined, { timeout: 30_000 });
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

/* ---------------- Authenticator ---------------- */

/**
 * Begin enrolling an authenticator. Nothing is live until a code confirms it,
 * so calling this again simply replaces an unconfirmed secret.
 */
export function setupTwoFactor() {
  return $http.post<any, components["schemas"]["TwoFactorSetupResponse"]>("/account/2fa/setup");
}

/**
 * Finish enrolment by proving the app produces the right code. The answer
 * carries the account's one recovery code, and that is the only time it is ever
 * shown, so the caller has to put it in front of the user before moving on.
 */
export function enableTwoFactor(code: string) {
  return $http.post<any, components["schemas"]["TwoFactorEnableResponse"]>("/account/2fa/enable", { code });
}

/**
 * A fresh recovery code for a saved copy that went missing while the
 * authenticator still works. The old one dies, and the new one is shown once,
 * exactly as at enrolment. Gated like `disableTwoFactor`, because handing a
 * recovery code to a borrowed session would hand over the account.
 */
export function replaceRecoveryCode(password: string, code: string) {
  return $http.post<any, components["schemas"]["TwoFactorEnableResponse"]>("/account/2fa/recovery-code", {
    password,
    code
  });
}

/**
 * The way back when the authenticator is gone but this session still works.
 * Two factor is switched off rather than the recovery code standing in for a
 * live one: whoever is here cannot produce codes any more, so leaving it on
 * would only lock them out again. The code is spent either way, and enrolling
 * again is what issues another.
 */
export function recoverTwoFactor(password: string, recoveryCode: string) {
  return $http.post<any, components["schemas"]["TwoFactorDisableResponse"]>("/account/2fa/recover", {
    password,
    recoveryCode
  });
}

/** Needs the password as well as a live code, so a stolen session cannot strip it. */
export function disableTwoFactor(password: string, code: string) {
  return $http.post<any, components["schemas"]["MessageResponse"]>("/account/2fa/disable", { password, code });
}

/**
 * Ask for a code at sign in as well, or stop asking. Enrolling an authenticator
 * does not do this on its own: the code was only ever needed to unlock spaces,
 * so logins keep working on the password alone until this is called.
 *
 * A live code is required either way, which proves the authenticator is in hand
 * before anyone depends on it to get in at all.
 */
export function setTwoFactorOnLogin(enabled: boolean, code: string) {
  return $http.post<any, components["schemas"]["TwoFactorLoginToggleResponse"]>("/account/2fa/login", {
    enabled,
    code
  });
}

/** Whether a username is already taken. */
export async function usernameExists(username: string) {
  const res = await $http.post<any, components["schemas"]["CheckUsernameResponse"]>("/auth/check-username", { username });
  return !!res.exists;
}

/**
 * What this browser calls itself in the account's session list. Guessed from
 * the user agent, which is all a browser can honestly offer, and kept short.
 */
export function describeThisDevice() {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser";

  const os =
    /iPhone|iPad/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "Mac"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "";

  return os ? `${browser} on ${os}` : browser;
}

/**
 * Either the login is done, or the account asks for an authenticator code and
 * hands back a challenge to finish with. Both arrive as a 200 from the api, so
 * callers branch on this rather than on a status code.
 */
export type LoginResult =
  | { status: "signed-in"; plan: "free" | "pro" | null; twoFactorDisabled: boolean }
  | { status: "code-required"; challenge: string };

function finishLogin(res: components["schemas"]["LoginResponse"]): LoginResult {
  if (res.twoFactorRequired && res.challenge) return { status: "code-required", challenge: res.challenge };

  // A 200 with neither a token nor a challenge is nothing anyone can act on.
  // Rejected in the shape alertRequestError reads, so it is at least visible.
  if (!res.token) {
    throw { response: { status: 500, data: { error: "The server did not return a sign-in token." } } };
  }

  $localStorage.set("token", res.token);
  // Only `auth/2fa/recover` sets this, and only the screen that sent someone
  // there can explain why the factor it just asked about is gone.
  return { status: "signed-in", plan: res.plan ?? null, twoFactorDisabled: !!res.twoFactorDisabled };
}

/** Log in. Stores the token unless the account still owes a code. */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await $http.post<any, components["schemas"]["LoginResponse"]>("/auth/login", {
    username,
    password,
    deviceName: describeThisDevice()
  });
  return finishLogin(res);
}

/**
 * The second half of a login that asked for a code. The challenge is opaque and
 * useless on its own: it lasts five minutes, covers one login, and stops working
 * if the password changes or the account signs out everywhere meanwhile. All of
 * those come back as a 401, where the move is a fresh password rather than a
 * retry. Codes are single use, and five wrong ones shut the step for fifteen
 * minutes.
 */
export async function loginWithCode(challenge: string, code: string): Promise<LoginResult> {
  const res = await $http.post<any, components["schemas"]["LoginResponse"]>("/auth/2fa", {
    challenge,
    code,
    deviceName: describeThisDevice()
  });
  return finishLogin(res);
}

/**
 * The same way back, for when it is the login itself that is blocked. Takes the
 * challenge `login` answered with, in place of the six digits, and switches two
 * factor off before finishing the login: the account signs in on its password
 * alone from here, and spaces that asked it for a code stop asking. Wrong
 * recovery codes count towards the same five-then-fifteen-minutes block.
 */
export async function loginWithRecoveryCode(challenge: string, recoveryCode: string): Promise<LoginResult> {
  const res = await $http.post<any, components["schemas"]["LoginResponse"]>("/auth/2fa/recover", {
    challenge,
    recoveryCode,
    deviceName: describeThisDevice()
  });
  return finishLogin(res);
}

/** Create an account. Email is optional and only used for password resets. The caller logs in afterwards. */
export function signup(username: string, password: string, email?: string) {
  const body: components["schemas"]["SignupBody"] = { username, password };
  if (email) body.email = email;
  return $http.post<any, components["schemas"]["MessageResponse"]>("/auth/signup", body);
}
