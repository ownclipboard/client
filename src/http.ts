import axios from "axios";
import config from "./config";
import { $alert } from "./components/ws-alert/ws-alert";
import { $localStorage } from "./stores/native";

export const $http = axios.create({
  baseURL: config.serverUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "oc-token": $localStorage.get("token")
  }
});

/**
 * Store the session token and use it on every following request. The instance
 * reads the token once at startup, so anything that issues a new one mid-session
 * has to put it here or the next request goes out with the dead one.
 */
export function setAuthToken(token: string) {
  $localStorage.set("token", token);
  const headers = $http.defaults.headers as any;
  headers["oc-token"] = token;
  if (headers.common) headers.common["oc-token"] = token;
}

$http.interceptors.response.use((response) => {

  if (response.data) {
    if (response.data.message) {
      $alert.success(response.data.message);
    } else if (response.data.info) {
      $alert.info(response.data.info);
    } else if (response.data.warning) {
      $alert.warning(response.data.warning);
    }
  }

  return response.data;
});

/**
 * Show the API's error message, or a plain explanation when the request never
 * got a response (timeout, offline, server down).
 */
export function alertRequestError(res: any) {
  if (res?.response) {
    const { data, status } = res.response;
    if (typeof data === "object" && data?.error) return $alert.error(data.error);
    return $alert.error(`Request failed (${status}).`);
  }

  if (res?.code === "ECONNABORTED" || res?.code === "ETIMEDOUT") {
    return $alert.error("The server took too long to respond. Please try again.");
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return $alert.error("You appear to be offline.");
  }
  if (res?.request) {
    return $alert.error("Could not reach the server. Please try again.");
  }
}

/**
 * Deleting a file clip, or a folder holding one, takes the object out of the
 * storage server first. When storage is disconnected that step is what fails,
 * so say so instead of repeating the api's generic rejection. A wrong password
 * already explains itself, so that message is left alone.
 */
export function alertDeleteError(res: any, storageConnected: boolean) {
  const apiError = String(res?.response?.data?.error ?? "");
  if (!storageConnected && res?.response && !/password/i.test(apiError)) {
    return $alert.error("File storage is disconnected, so the files could not be removed. Reconnect it in Settings, then try again.");
  }
  return alertRequestError(res);
}
