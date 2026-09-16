import { $http } from "../http";
import type { components } from "../types/api";
import type { OwnClip } from "../types/models.types";

type FileUploadResponse = components["schemas"]["FileUploadResponse"];
type FileConfirmResponse = components["schemas"]["FileConfirmResponse"];
type FileUrlResponse = components["schemas"]["FileUrlResponse"];
type FileListResponse = components["schemas"]["FileListResponse"];
export type Owns3Status = components["schemas"]["Owns3Status"];
export type StoredFile = components["schemas"]["File"];
export type FilePreview = components["schemas"]["FilePreview"];

export type ListFilesOptions = {
  page?: number;
  perPage?: number;
  /** Folder slug. */
  folder?: string;
  /** Content type prefix: `image` for every image, `image/png` for PNGs only. */
  type?: string;
};

/**
 * Thrown when the browser could not deliver the file to the storage bucket at all
 * (no HTTP status). With a working API connection this is almost always a missing
 * CORS rule on the bucket, or mixed content (https page, http bucket).
 */
export class StorageUploadBlockedError extends Error {
  readonly kind: "cors" | "mixed-content";
  readonly url: string;

  constructor(kind: "cors" | "mixed-content", url: string) {
    super(
      kind === "mixed-content"
        ? "The storage server url is http but this page is https, browsers block that."
        : "The storage bucket refused the browser upload (CORS)."
    );
    this.name = "StorageUploadBlockedError";
    this.kind = kind;
    this.url = url;
  }
}

export type UploadOptions = {
  folder: string;
  title?: string;
  onProgress?: (percent: number) => void;
};

/**
 * Upload a file to the user's owns3 storage.
 *  1. ask the API for a presigned upload slot
 *  2. PUT the bytes straight to storage (no oc-token)
 *  3. confirm with the API, which creates the file clip
 */
export async function uploadFile(file: File, { folder, title, onProgress }: UploadOptions): Promise<OwnClip> {
  const contentType = file.type || "application/octet-stream";

  const { file: record, upload } = await $http.post<any, FileUploadResponse>(
    "files/upload",
    { name: file.name, title: title || undefined, contentType, size: file.size, folder }
  );

  await putToStorage(upload.url, upload.method, upload.headers, file, onProgress);

  const { clip } = await $http.post<any, FileConfirmResponse>(`file/${record.publicId}/confirm`);

  if (!clip) throw new Error("Upload confirmed but no clip was returned.");
  return clip as OwnClip;
}

/**
 * PUT the raw body to the presigned url. Uses XHR so upload progress can be reported.
 */
function putToStorage(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress?: (percent: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => {
      const mixed = window.location.protocol === "https:" && url.startsWith("http:");
      if (mixed) return reject(new StorageUploadBlockedError("mixed-content", url));
      if (!navigator.onLine) return reject(new Error("Upload failed: you appear to be offline."));
      reject(new StorageUploadBlockedError("cors", url));
    };
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(body);
  });
}

/**
 * Every uploaded file, newest first. When the user's owns3 app has preview links
 * on, each file carries a `previewUrl` that needs no authentication, and the
 * shared `preview` block says when the key behind them rotates: re-fetch at
 * `preview.expiresAt`. A null `preview` means falling back to `getFileUrl`.
 */
export function listFiles(options: ListFilesOptions = {}) {
  return $http.get<any, FileListResponse>("files", { params: options });
}

/** Temporary (1 hour) download url for a file clip. Signed by the storage server. */
export async function getFileUrl(filePublicId: string) {
  const { url } = await $http.get<any, FileUrlResponse>(`file/${filePublicId}/url`);
  return url;
}

export function getOwns3Status() {
  return $http.get<any, Owns3Status>("account/owns3");
}

export function connectOwns3(endpoint: string, apiKey: string) {
  return $http.post<any, components["schemas"]["Owns3ConnectResponse"]>("account/owns3", { endpoint, apiKey });
}

/** Pro only: store files on the storage operated by OwnClipboard instead of an own server. */
export function useDefaultOwns3() {
  return $http.post<any, components["schemas"]["Owns3ConnectResponse"]>("account/owns3/use-default");
}

export function disconnectOwns3() {
  return $http.post<any, components["schemas"]["Owns3DisconnectResponse"]>("account/owns3/disconnect");
}

/** Human readable file size. */
export function humanFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
