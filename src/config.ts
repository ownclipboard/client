// Declare environment variables
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;

// Parse url
const { protocol, hostname, port } = window.location;
// If port exists use server port or omit port.
const $port = port && port.length ? ":3003" : "";
const domain = `${hostname}${$port}`;
const baseUrl = `${protocol}//${domain}/client/v1`;

// Export config
export default {
  isDev,
  isProd,
  name: import.meta.env.VITE_APP_NAME || "OwnClipboard",
  domain,
  baseUrl
};
