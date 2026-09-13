import { ref } from "vue";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
};

export const ShowConfirm = ref(false);
export const ConfirmOptionsRef = ref<ConfirmOptions>({ title: "" });
export const ConfirmResolveFn = ref<(ok: boolean) => void>(() => {});

/** Ask the user to confirm an action. Resolves true when confirmed. */
export function askToConfirm(options: ConfirmOptions): Promise<boolean> {
  ConfirmOptionsRef.value = options;
  ShowConfirm.value = true;
  return new Promise((resolve) => {
    ConfirmResolveFn.value = resolve;
  });
}
