import { $http } from "../http";
import type { AuthUser, AuthUserStore } from "../stores/auth.store";

import type { SubStat } from "../types/models.types";

export async function refreshAuthData(st: AuthUserStore) {
  try {
    const { user, subscription } = await $http.get<any, { user: AuthUser, subscription: SubStat }>("/ping");
    // Update authUser
    st.data = user;
    // Update Subscription
    st.subscription = subscription;
  } catch {
    st.signOut();
  }
}
