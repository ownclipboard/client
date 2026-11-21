import { $http } from "../http";
import type { components } from "../types/api";
import type { OwnClip } from "../types/models.types";

type FileUploadResponse = components["schemas"]["FileUploadResponse"];
type FileConfirmResponse = components["schemas"]["FileConfirmResponse"];
type FileUrlResponse = components["schemas"]["FileUrlResponse"];
type FileListResponse = components["schemas"]["FileListResponse"];
export type StorageStatus = components["schemas"]["StorageStatus"];
export type StorageConnectBody = components["schemas"]["StorageConnectBody"];
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
 * Upload a file to the account's storage.
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
export function putToStorage(
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
 * Every uploaded file, newest first. Each file carries a `previewUrl` that needs
 * no authentication, and every url in one response is signed for the same window,
 * so the shared `preview` block says when they all stop working: re-fetch by
 * `preview.expiresAt`. A null `preview` means falling back to `getFileUrl`.
 */
export function listFiles(options: ListFilesOptions = {}) {
  return $http.get<any, FileListResponse>("files", { params: options });
}

/**
 * Temporary (1 hour) download url for a file clip. Signed by the storage server.
 * `thumb` asks for the 200x200 version instead, which only images have.
 */
export async function getFileUrl(filePublicId: string, thumb = false) {
  const { url } = await $http.get<any, FileUrlResponse>(`file/${filePublicId}/url`, {
    params: thumb ? { thumb: 1 } : undefined
  });
  return url;
}

/**
 * Remove a file. An upload arrives as a clip of its own, so this is the clip
 * delete, which is also what takes the object out of storage. A folder with a
 * password wants that password, exactly as deleting any other clip does.
 */
export function deleteFile(filePublicId: string, password?: string) {
  return $http.post<any, components["schemas"]["MessageResponse"]>(`clip/${filePublicId}/delete`, { password });
}

export function getStorageStatus() {
  return $http.get<any, StorageStatus>("account/storage");
}

/**
 * Point the account at an s3 bucket of its own. Any s3 compatible storage works.
 * The secret access key is stored encrypted and never comes back.
 *
 * `prefix` is the field that needs care. When the account already has files it has
 * to be the prefix those files are already stored under, and the api proves that by
 * reading one of them back rather than taking it on trust: a wrong prefix comes
 * back as a 400 naming the file it went looking for. Show that message rather than
 * a generic failure, because it is the only thing that tells the user what to fix.
 */
export function connectStorage(body: StorageConnectBody) {
  return $http.post<any, components["schemas"]["StorageConnectResponse"]>("account/storage", body);
}

/** Pro only: keep files in the bucket OwnClipboard operates instead of one of your own. */
export function useAppStorage() {
  return $http.post<any, components["schemas"]["StorageConnectResponse"]>("account/storage/use-default");
}

export function disconnectStorage() {
  return $http.post<any, components["schemas"]["StorageDisconnectResponse"]>("account/storage/disconnect");
}

/** Human readable file size. */
export function humanFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
