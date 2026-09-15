import { ref } from "vue";

/** Whether the inline "new clip" composer is open on the clipboard page. */
export const composerOpen = ref(false);

export function openComposer() {
  composerOpen.value = true;
}

export function closeComposer() {
  composerOpen.value = false;
}
