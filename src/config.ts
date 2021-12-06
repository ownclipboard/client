/**
 * Parse url
 */
const { protocol, hostname, port } = window.location;
// If port exists use server port or omit port.
const $port = port && port.length ? ":3003" : "";
const domain = `${hostname}${$port}`;
const baseUrl = `${protocol}//${domain}/api/v1`;

export default {
  name: import.meta.env.VITE_APP_NAME || "OwnClipboard",
  domain,
  baseUrl
};
