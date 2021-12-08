import { vueLocalStorage, vueSessionStorage } from "@trapcode/browser-storage/vue";
import { isProd } from "../config";

// Declare own local and session storage library.
const $localStorage = vueLocalStorage("oc");
const $sessionStorage = vueSessionStorage("oc");

// Enable base 64 encoding for both storage.
$localStorage.enableBase64Encryption(isProd);
$sessionStorage.enableBase64Encryption(isProd);

// Export both storage.
export { $sessionStorage, $localStorage };
