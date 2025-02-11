<script lang="ts" setup>
import { onMounted } from "vue";
import NavBar from "../components/NavBar.vue";
import { useAuthUser } from "../stores/auth.store";
import { refreshAuthData } from "../services/auth.service";

const authUser = useAuthUser();

async function ping() {
  return refreshAuthData(authUser);
}

onMounted(ping);
</script>

<template>
  <section v-if="!authUser.isLogged">Authenticating...</section>
  <section v-else-if="authUser.isLogged" class="pb-10">
    <NavBar />

    <div v-if="!authUser.data!.plan && $route.name !='pricing'" class="bg-teal-900 p-3 text-white text-center">
      <h1>Hello <span>{{ authUser.data!.username }},</span> you have not selected a subscription plan yet!
        <RouterLink :to="{name:'pricing'}" class="text-antiquewhite">Choose plan</RouterLink>
      </h1>
    </div>

    <section class="container py-10">
      <router-view />
    </section>
    <PasswordPrompt />
  </section>
  <!--  <section v-else-if="authenticated === false">Login Required!</section>-->

  <DebugDock />
</template>
