import { $localStorage, $sessionStorage } from "./native";
import { reactive, watch } from "vue";

export const currentTab = $sessionStorage.persistedRef("currentTab", "clipboard");

export const openTabs = reactive(
  $localStorage.getObject("tabs", [
    { name: "Clipboard", slug: "clipboard", count: "52" },
    { name: "Encrypted", slug: "encrypted", count: "6" }
  ])
)!;

// Watch for changes to the openTabs array
watch(openTabs, (n) => $localStorage.setAsType("tabs", n), { immediate: true });
