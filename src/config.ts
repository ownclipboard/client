// Declare environment variables
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;

const { protocol, hostname, port } = window.location;
const baseUrl = `${protocol}//${hostname}${port ? ":" + port : ""}`;

/**
 * Resolve the API origin. When the configured url points at localhost but the
 * app itself is opened from another host (a LAN ip on a phone, for example),
 * swap in the current hostname so requests reach the same machine's API.
 */
function resolveServerUrl(): string {
  const configured = import.meta.env.VITE_APP_SERVER_URL || "http://localhost:3003";
  try {
    const url = new URL(configured);
    const isLocal = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(url.hostname);
    const pageIsLocal = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    if (isLocal && !pageIsLocal) {
      url.hostname = hostname;
    }
    return url.origin;
  } catch {
    return configured.replace(/\/+$/, "");
  }
}

const serverUrl = `${resolveServerUrl()}/client/v1`;

// Export config
export default {
  isDev,
  isProd,
  name: (import.meta.env.VITE_APP_NAME || "OwnClipboard") as string,
  domain: `${hostname}${port ? ":" + port : ""}`,
  baseUrl,
  serverUrl
};
