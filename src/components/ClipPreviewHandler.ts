import { ref } from "vue";
import type { OwnClip } from "../types/models.types";

export const ShowClipPreview = ref(false);
export const ClipPreviewClip = ref<OwnClip | null>(null);

/** Open the preview modal for a clip. Encrypted clips must be decrypted first. */
export function previewClip(clip: OwnClip) {
  if (clip.encrypted && !clip.decrypted) return;
  ClipPreviewClip.value = clip;
  ShowClipPreview.value = true;
}

export function closeClipPreview() {
  ShowClipPreview.value = false;
  ClipPreviewClip.value = null;
}
