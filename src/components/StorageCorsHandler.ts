import { ref } from "vue";

export type StorageProvider = "backblaze" | "r2" | "aws" | "s3";

export type StorageCorsInfo = {
  kind: "cors" | "mixed-content";
  /** The presigned url the browser tried to PUT to. */
  url: string;
  host: string;
  /** Bucket base url without the object key, e.g. https://s3.eu-central-003.backblazeb2.com/my-bucket */
  bucketUrl: string;
  bucket: string;
  endpoint: string;
  provider: StorageProvider;
  /** Origin of this web app, the value the CORS rule must allow. */
  origin: string;
};

export const ShowStorageCorsHelp = ref(false);
export const StorageCorsDetails = ref<StorageCorsInfo | null>(null);

/**
 * Work out the provider, bucket and endpoint from a presigned S3 url.
 * Handles both virtual-host (bucket.host) and path-style (host/bucket) urls.
 */
export function describeStorageUrl(rawUrl: string, kind: StorageCorsInfo["kind"] = "cors"): StorageCorsInfo {
  const url = new URL(rawUrl);
  const host = url.host;
  const labels = url.hostname.split(".");
  const firstPath = url.pathname.split("/").filter(Boolean)[0] || "";

  let provider: StorageProvider = "s3";
  if (url.hostname.endsWith("backblazeb2.com")) provider = "backblaze";
  else if (url.hostname.endsWith("r2.cloudflarestorage.com")) provider = "r2";
  else if (url.hostname.endsWith("amazonaws.com")) provider = "aws";

  // Virtual-host style when the host has an extra leading label before the service host.
  // Backblaze: s3.<region>.backblazeb2.com (path) or <bucket>.s3.<region>.backblazeb2.com
  // R2: <account>.r2.cloudflarestorage.com (path style only)
  // AWS: s3.<region>.amazonaws.com (path) or <bucket>.s3.<region>.amazonaws.com
  let virtualHost = false;
  if (provider === "backblaze" || provider === "aws") virtualHost = labels[0] !== "s3" && labels[1] === "s3";
  // Generic providers: assume path style (owns3's default) unless the host has an extra label in
  // front of a region endpoint, e.g. <bucket>.nyc3.digitaloceanspaces.com.
  else if (provider === "s3") virtualHost = labels.length >= 4 && labels[0] !== "s3";

  const bucket = virtualHost ? labels[0] : firstPath;
  const endpointHost = virtualHost ? labels.slice(1).join(".") + (url.port ? `:${url.port}` : "") : host;
  const endpoint = `${url.protocol}//${endpointHost}`;
  const bucketUrl = virtualHost ? `${url.protocol}//${host}` : `${endpoint}/${bucket}`;

  return { kind, url: rawUrl, host, bucketUrl, bucket, endpoint, provider, origin: window.location.origin };
}

export function showStorageCorsHelp(url: string, kind: StorageCorsInfo["kind"] = "cors") {
  StorageCorsDetails.value = describeStorageUrl(url, kind);
  ShowStorageCorsHelp.value = true;
}

export function hideStorageCorsHelp() {
  ShowStorageCorsHelp.value = false;
}
