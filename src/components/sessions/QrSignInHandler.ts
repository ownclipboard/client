import { ref } from "vue";

/**
 * The QR dialog is reachable from the sidebar on every page, so its open state
 * lives here instead of in whichever screen happens to hold a button for it.
 */
export const ShowQrSignIn = ref(false);

export function openQrSignIn() {
  ShowQrSignIn.value = true;
}

export function closeQrSignIn() {
  ShowQrSignIn.value = false;
}
