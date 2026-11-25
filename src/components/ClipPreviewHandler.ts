import { ref } from "vue";
import type { OwnClip } from "../types/models.types";
import type { FileUrlOptions } from "../services/files.service";

export const ShowClipPreview = ref(false);
export const ClipPreviewClip = ref<OwnClip | null>(null);

/**
 * Where to get the download url for the clip being previewed. Clips in a space
 * live behind their own endpoint, so the opener supplies the resolver and the
 * modal stays unaware of which kind of clip it is showing. The options are
 * passed through so the modal can ask for a download, and for the name it saves
 * as, without knowing which endpoint answers.
 */
export type ClipUrlResolver = (clip: OwnClip, options?: FileUrlOptions) => Promise<string>;

export const ClipPreviewUrlResolver = ref<ClipUrlResolver | null>(null);

/** Open the preview modal for a clip. Encrypted clips must be decrypted first. */
export function previewClip(clip: OwnClip, getUrl?: ClipUrlResolver) {
  if (clip.encrypted && !clip.decrypted) return;
  ClipPreviewClip.value = clip;
  ClipPreviewUrlResolver.value = getUrl || null;
  ShowClipPreview.value = true;
}

export function closeClipPreview() {
  ShowClipPreview.value = false;
  ClipPreviewClip.value = null;
  ClipPreviewUrlResolver.value = null;
}
