import { nanoid } from "nanoid";
import { $http } from "../http";
import { $events } from "../events";
import { aesEncrypt } from "../functions/crypto";
import { currentTab, folderNeedsPassword, foldersAsObject, getFolders } from "../stores/tabs.store";
import { askForPassword } from "../components/PasswordPromptHandler";
import { $alert } from "../components/ws-alert/ws-alert";
import { checkFolderPassword } from "./clips.services";

/**
 * Save text into the current folder, encrypting first when the folder has a password.
 * Returns true when a clip was created.
 */
export async function pasteText(text: string, title?: string): Promise<boolean> {
  let content = text.trim();
  if (!content.length) return false;

  const folder = foldersAsObject.value[currentTab.value];

  // Without a password there is no key, and the clip would land in an encrypted
  // folder as plain text. Refuse instead of storing it in the clear.
  if (folderNeedsPassword(folder)) {
    $alert.warning(`"${folder.name}" has no encryption password yet. Set a password in the folder settings before adding clips.`);
    return false;
  }

  if (folder && folder.hasPassword) {
    let password = await askForPassword(`Enter the password for "${folder.name}" to encrypt this clip.`);
    if (!password) {
      $alert.warning(`A password is required to paste into "${folder.name}".`);
      return false;
    }
    if (!(await checkFolderPassword(folder.slug, password))) {
      $alert.error(`Incorrect password for "${folder.name}".`);
      return false;
    }
    content = aesEncrypt(content, password);
    password = "";
  }

  const data: Record<string, any> = { content, folder: currentTab.value };
  if (title) data.title = title;

  await $http.post("clips/paste", data);
  $events.emit("refreshClips");
  await getFolders();
  return true;
}

function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { lastModified: Date.now(), type: blob.type });
}

export type PasteItem = { type: "text"; data: string } | { type: "image"; data: File } | null;

/** Read the system clipboard through the async Clipboard API (needs permission). */
export async function readSystemClipboard(): Promise<PasteItem> {
  try {
    const items = await navigator.clipboard.read();
    const item = items?.[0];
    if (!item) return null;

    if (item.types.includes("text/plain")) {
      const blob = await item.getType("text/plain");
      return { type: "text", data: await blob.text() };
    }
    const imageType = item.types.find((t) => t.startsWith("image/"));
    if (imageType) {
      const blob = await item.getType(imageType);
      const ext = imageType.split("/")[1] || "png";
      return { type: "image", data: blobToFile(blob, `${nanoid()}.${ext}`) };
    }
  } catch {
    // Permission denied or unsupported: fall back to readText.
    try {
      const text = await navigator.clipboard.readText();
      if (text) return { type: "text", data: text };
    } catch {
      /* nothing to paste */
    }
  }
  return null;
}

/** Extract what a native paste event carries. */
export function readPasteEvent(e: ClipboardEvent): PasteItem {
  const dt = e.clipboardData;
  if (!dt) return null;

  const file = Array.from(dt.files || []).find((f) => f.type.startsWith("image/"));
  if (file) return { type: "image", data: file.name ? file : blobToFile(file, `${nanoid()}.${file.type.split("/")[1] || "png"}`) };

  const text = dt.getData("text/plain");
  if (text) return { type: "text", data: text };
  return null;
}
