<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { $localStorage } from "../stores/native";
import { $http } from "../http";
import { redirect } from "../functions";
import NavBar from "../components/NavBar.vue";
import { askForPassword } from "../components/PasswordPrompt";

const authenticated = ref<boolean>();

function ping() {
  if ($localStorage.has("token")) {
    authenticated.value = true;
  }

  return $http.get<any, { user: any }>("/ping").catch(() => {
    authenticated.value = false;
    $localStorage.remove("token");
    // Redirect to login page.
    redirect("/", 3000);
  });
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
