<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { $localStorage } from "../stores/native";
import { $http } from "../http";
import { redirect } from "../functions";
import NavBar from "../components/NavBar.vue";
import { askForPassword } from "../components/PasswordPromptHandler";
import { authUser } from "../stores/auth.store";

const authenticated = ref<boolean>();

async function ping() {
  if ($localStorage.has("token")) {
    authenticated.value = true;
  }

  try {
    const { user } = await $http.get<any, { user: authUser }>("/ping");
    // Update authUser
    Object.assign(authUser, user);
  } catch {
    authenticated.value = false;
    $localStorage.remove("token");
    // Redirect to login page.
    redirect("/", 3000);
  }
}

onMounted(ping);
</script>

<template>
  <section v-if="authenticated === undefined">Authenticating...</section>
  <section v-else-if="authenticated === true">
    <NavBar />
    <section class="container py-10">
      <router-view />
    </section>
    <PasswordPrompt />
  </section>
  <section v-else-if="authenticated === false">Login Required!</section>
</template>