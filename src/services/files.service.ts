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

/**
 * The api's ceiling on a single file, whatever storage it goes to, an account's
 * own bucket included.
 *
 * Mirrored here only to turn a doomed upload away before it starts: the api is
 * what decides, and it measures the real object at confirm, where a file over
 * the limit is deleted again along with its record. So a wrong value here costs
 * a wasted upload at worst, never a file that should not have been let through.
 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024 * 1024;

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

export type FileUrlOptions = {
  /** The 200x200 thumbnail instead of the file, which only images have. */
  thumb?: boolean;
  /** Save the file rather than open it: the url answers with an attachment. */
  download?: boolean;
  /**
   * Which name a download saves as. The api decides what each one resolves to —
   * `title` slugifies the clip's title and keeps the file's real extension, and
   * falls back to the stored name when there is no title worth using — so the
   * two can land on the same name, and working that out here would only risk
   * disagreeing with it.
   */
  name?: "title" | "filename";
};

/** Shared by the personal and space url routes, which take the same query. */
export function fileUrlParams(options: FileUrlOptions) {
  const params: Record<string, string> = {};
  if (options.thumb) params.thumb = "1";
  if (options.download) params.download = "1";
  if (options.name) params.name = options.name;
  return Object.keys(params).length ? params : undefined;
}

/**
 * Temporary (1 hour) download url for a file clip. Signed by the storage server.
 */
export async function getFileUrl(filePublicId: string, options: FileUrlOptions = {}) {
  const { url } = await $http.get<any, FileUrlResponse>(`file/${filePublicId}/url`, {
    params: fileUrlParams(options)
  });
  return url;
}

/**
 * Start a download from a signed url.
 *
 * Asked for with `download`, the storage answers with an attachment, so the
 * browser saves the file and the page stays where it is. That is why there is no
 * tab opened ahead of the fetch here: nothing navigates, so nothing is mistaken
 * for a popup, and a failed url fetch leaves no blank tab to close.
 */
export function startDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
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
