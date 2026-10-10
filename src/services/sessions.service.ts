/**
 * Where the account is signed in, and signing a phone in by QR.
 *
 * A session is created by every login and carries the name the client gave
 * itself. Only the two halves a browser can play live here: listing and
 * revoking sessions, and the approving side of a QR login. Scanning and
 * collecting the token belong to the device without a session yet.
 */
import { $http } from "../http";
import type { components } from "../types/api";

export type SessionInfo = components["schemas"]["SessionInfo"];
export type QrStatus = components["schemas"]["QrStatusResponse"];

type MessageResponse = components["schemas"]["MessageResponse"];

/* ---------------- Sessions ---------------- */

/** Live sessions, most recently used first. */
export function getSessions() {
  return $http.get<any, components["schemas"]["SessionsResponse"]>("account/sessions");
}

/** Ends one session. Revoking your own is the same as signing out. */
export function revokeSession(sessionId: string) {
  return $http.post<any, components["schemas"]["RevokeSessionResponse"]>(`account/sessions/${sessionId}/revoke`);
}

/** Ends every session but this one. */
export function revokeOtherSessions() {
  return $http.post<any, components["schemas"]["RevokeOthersResponse"]>("account/sessions/revoke-others", undefined, {
    timeout: 30_000
  });
}

/* ---------------- QR sign-in ---------------- */

/**
 * Step 1, from a device already signed in: make a code to show as a QR. It
 * lasts two minutes, survives one scan, and replaces any earlier code.
 */
export function createQrCode() {
  return $http.post<any, components["schemas"]["QrCreateResponse"]>("auth/qr");
}

/** Where that code has got to. `pending` means a device scanned and is waiting on you. */
export function getQrStatus() {
  return $http.get<any, QrStatus>("auth/qr");
}

/** Lets the device that scanned collect a token. Only ever for a device you just scanned with. */
export function approveQrLogin() {
  return $http.post<any, MessageResponse>("auth/qr/approve");
}

/** Refuses it. The code dies with it, so make another to try again. */
export function denyQrLogin() {
  return $http.post<any, MessageResponse>("auth/qr/deny");
}
