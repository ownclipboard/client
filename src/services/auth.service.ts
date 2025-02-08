import { $localStorage } from "../stores/native";
import { $http } from "../http";
import type { AuthUser, AuthUserStore } from "../stores/auth.store";
import { redirect } from "../functions";

export async function refreshAuthData(st: AuthUserStore) {
  try {
    const { user } = await $http.get<any, { user: AuthUser }>("/ping");
    // Update authUser
    st.data = user;
  } catch {
    $localStorage.remove("token");
    // Redirect to login page.
    redirect("/", 3000);
  }
}
