<template>
  <div class="ws-alert-container">
    <transition-group
      enter-active-class="animate__animated animate__fadeInUp animate__fast"
      leave-active-class="animate__animated animate__fadeOutUp animate__faster"
    >
      <template v-for="a in Alerts" :key="a.id">
        <div class="ws-alert" :class="a.type">
          <div class="ws-alert-icon">
            <i :class="a.icon"></i>
          </div>
          <div class="ws-alert-message" v-html="a.message"></div>
          <a @click="closeAlert(a.id)" href="#" class="ws-alert-close">
            <i class="fa fa-times"></i>
          </a>
        </div>
      </template>
    </transition-group>
  </div>
</template>

<script lang="ts">
import { Alerts, closeAlert } from "./ws-alert";

export default {
  name: "WsAlert",
  setup() {
    return { Alerts, closeAlert };
  }
};
</script>

<style lang="scss" scoped>
@import "./ws-alert.scss";
</style>
