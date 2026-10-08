import { ref } from "vue";
import type { OwnClip } from "../types/models.types";

export const ShowClipPreview = ref(false);
export const ClipPreviewClip = ref<OwnClip | null>(null);

/**
 * Where to get the download url for the clip being previewed. Clips in a space
 * live behind their own endpoint, so the opener supplies the resolver and the
 * modal stays unaware of which kind of clip it is showing.
 */
export const ClipPreviewUrlResolver = ref<((clip: OwnClip) => Promise<string>) | null>(null);

/** Open the preview modal for a clip. Encrypted clips must be decrypted first. */
export function previewClip(clip: OwnClip, getUrl?: (clip: OwnClip) => Promise<string>) {
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
