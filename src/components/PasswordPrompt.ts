import { ref } from "vue";

export const ShowPasswordPrompt = ref(false);
export const PasswordPromptLabel = ref("Enter your password:");
export const PasswordPromptResolveFn = ref<any>(() => { });

export function askForPassword(label: string): Promise<string | undefined> {
    PasswordPromptLabel.value = label;
    ShowPasswordPrompt.value = true;

    return new Promise((resolve) => {
        PasswordPromptResolveFn.value = resolve;
    });
}