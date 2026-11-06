<script setup lang="ts">
import { QrCodeIcon } from "@heroicons/vue/20/solid";
import { openQrSignIn } from "../../components/sessions/QrSignInHandler";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import SessionList from "../../components/sessions/SessionList.vue";
</script>

<template>
  <Card title="Sessions" description="Every sign-in to your account, including this one.">
    <template #header>
      <Button size="sm" @click="openQrSignIn">
        <QrCodeIcon class="h-4 w-4" />Sign in another device
      </Button>
    </template>

    <SessionList />
  </Card>
</template>
