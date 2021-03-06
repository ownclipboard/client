<script setup lang="ts">
import config from "../config";
import { reactive, ref } from "vue";
import { $http, alertRequestError } from "../http";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $localStorage } from "../stores/native";
import { $alert } from "../components/ws-alert/ws-alert";
import { redirect } from "../functions";
import Intro from "../components/Intro.vue";

const userNameExists = ref<boolean>();
const form = reactive({
  username: "ownclipboard",
  password: "ownclipboard"
});

function checkUsername(btn: ILoadingButton) {
  if (!form.username) return btn.stopLoading();

  return $http
    .post<any, { exists: boolean }>("/auth/check-username", {
      username: form.username
    })
    .then((res) => {
      userNameExists.value = res.exists;
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function login(btn: ILoadingButton) {
  if (!form.username || !form.password) return btn.stopLoading();

  return $http
    .post<any, { token: string }>("/auth/login", {
      username: form.username,
      password: form.password
    })
    .then((res) => {
      $alert.success("Login successful, Redirecting to your clipboard...");
      $localStorage.set("token", res.token);

      redirect("/clipboard", 3000);
    })
    .catch((e) => {
      alertRequestError(e);
      btn.stopLoading();
    });
}
</script>

<template>
  <div class="lg:pl-5 lg:pt-5">
    <Intro />

    <!-- Auth Form  -->
    <div class="flex mt-5 lg:mt-10">
      <div class="m-auto max-w-md w-full p-5 rounded">
        <!-- Check Username  -->
        <form class="space-y-3">
          <template v-if="userNameExists === undefined">
            <div>
              <input
                v-model="form.username"
                autocomplete="off"
                type="text"
                id="check_username"
                placeholder="Username"
              />
            </div>

            <div>
              <LoadingButton
                type="submit"
                message="Checking"
                :click="checkUsername"
                icon="fa fa-slash fa-spin mr-3"
              >
                <i class="fas fa-check text-green-600 mr-1"></i>
                CHECK USERNAME
              </LoadingButton>
            </div>
          </template>

          <template v-else-if="userNameExists === true">
            <div class="p-3 bg-gray-700 rounded-sm border-l-2 border-green-300">
              Welcome <strong class="text-green-300">{{ form.username }}</strong
              >, Login to continue.
            </div>

            <div>
              <label for="password">Password:</label>
              <input
                v-model="form.password"
                autocomplete="off"
                type="password"
                id="password"
                placeholder="Account Password"
              />
            </div>

            <div>
              <LoadingButton
                type="submit"
                message="Validating"
                :click="login"
                icon="fa fa-slash fa-spin mr-3"
              >
                <i class="fas fa-check text-green-600 mr-1"></i>
                LOGIN
              </LoadingButton>
            </div>
          </template>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../assets/scss/var";

label {
  @apply block;
}

input {
  background-color: var.$darker;
  @apply block;
  @apply w-full;
  @apply p-3;
  @apply border;
  @apply border-gray-600;
  @apply rounded;
  @apply outline-none;
  @apply focus:bg-white;
  @apply focus:text-gray-900;
}

button {
  @apply bg-gray-300 text-black font-medium;
  @apply p-2 w-full;
  @apply rounded;
  @apply hover:bg-gray-100;
}
</style>
