// Declare environment variables
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
let serverUrl = import.meta.env.VITE_APP_SERVER_URL || "http://localhost:3003";

// Parse url
const { protocol, hostname, port } = window.location;
// If port exists use server port or omit port.
const $port = port && port.length ? ':' + port : ":3004";
const domain = `${hostname}${$port}`;
const baseUrl = `${protocol}//${domain}`;
serverUrl = `${serverUrl}/client/v1`;

// Export config
export default {
  isDev,
  isProd,
  name: import.meta.env.VITE_APP_NAME || "OwnClipboard",
  domain,
  baseUrl,
  serverUrl
};
