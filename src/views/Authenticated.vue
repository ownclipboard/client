<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { $localStorage } from "../stores/native";
import { $http } from "../http";
import { redirect } from "../functions";
import SideBar from "../components/NavBar.vue";

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
    <SideBar />
    <section class="container py-10">
      <router-view />
    </section>
  </section>
  <section v-else-if="authenticated === false">Login Required!</section>
</template>
