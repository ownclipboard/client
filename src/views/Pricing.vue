<template>
  <div>
    <div class="text-2xl text-left mb-3">
      Pricing
    </div>

    <div class="table-container">
      <table class="table w-full">
        <thead>
        <tr>
          <th class="w-8"></th>
          <th>Feature</th>
          <th>Free</th>
          <th>Pro</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td></td>
          <td></td>
          <td>
            <b class="text-lg">FREE</b>
          </td>
          <td>
            <b class="text-lg">$1/month</b>
            <br>
            <b class="text-green-500 text-lg">$10/Year</b>
          </td>
        </tr>
        <tr v-for="item in pricing" :key="item.feature">
          <td class="flex justify-center items-center w-12 px-2">
            <i v-if="item.icon" :class="item.icon" class="far fa-2x text-antiquewhite"></i>
          </td>
          <td>
            <span>{{ item.feature }}</span>
            <template v-if="item.desc">
              <br>
              <span class="text-sm text-gray-400">{{ item.desc }}</span>
            </template>
          </td>
          <td>
            <template v-if="typeof item.free === 'string'">
              <span>{{ item.free }}</span>
            </template>
            <template v-else>
              <i v-if="item.free" class="fas fa-check text-green-500"></i>
              <i v-else class="fas fa-times text-gray-500"></i>
            </template>
          </td>
          <td>
            <template v-if="typeof item.pro === 'string'">
              <span>{{ item.pro }}</span>
            </template>
            <template v-else>
              <i v-if="item.pro" class="fas fa-check text-green-500"></i>
              <i v-else class="fas fa-times text-gray-500"></i>
            </template>
          </td>
        </tr>

        <tr>
          <td></td>
          <td></td>
          <td>
            <b class="text-lg">FREE</b>
          </td>
          <td>
            <b class="text-lg">$1/month</b>
            <br>
            <b class="text-green-500 text-lg">$10/Year</b>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-5 flex items-center justify-center space-x-10 text-xl font-medium">
      <LoadingButton
        :click="choosePlan"
        data="free"
        class="flex flex-col pl-3 bg-gray-900 hover:bg-gray-950 py-2 rounded w-full">
        <span class="text-green-500">Free!</span>
        <small class="text-sm">Forever</small>
      </LoadingButton>
      <LoadingButton
        :click="choosePlan"
        data="pro"
        class="flex flex-col pl-3 bg-gray-900 hover:bg-gray-950 py-2 rounded w-full">
        <span class="text-green-500">Try Pro</span>
        <small class="text-sm">7 Days</small>
      </LoadingButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ILoadingButton } from "revue-components/vues/component-types";
import { $http, alertRequestError } from "../http";
import { useRouter } from "vue-router";

const $router = useRouter();

const pricing = [
  {
    feature: "Unlimited Clips",
    free: true,
    pro: true,
    icon: "far fa-clipboard"
  },
  {
    feature: "Folders",
    free: "100",
    pro: "Unlimited",
    icon: "far fa-folder"
  },
  {
    feature: "Public Paste",
    desc: "Share a folder publicly for anyone to paste content",
    free: true,
    pro: true,
    icon: "far fa-globe"
  },
  {
    feature: "Mobile App",
    desc: "Access your clips on the go with our IOS/Android mobile app.",
    free: true,
    pro: true,
    icon: "far fa-mobile"
  },
  {
    feature: "Chrome Extension",
    desc: "Quickly paste content with our Chrome Extension",
    free: true,
    pro: true,
    icon: "fab fa-chrome"
  },
  {
    feature: "Content Encryption",
    desc: "Secure clips and files with 256-bit encryption",
    free: true,
    pro: true,
    icon: "fas fa-lock"
  },
  {
    feature: "File Upload",
    desc: "Upload media files with 99% uptime and Backup",
    free: false,
    pro: "10 GB",
    icon: "far fa-cloud-upload"
  },
  {
    feature: "Edit Clips",
    desc: "Update your clips with our editor",
    free: false,
    pro: true,
    icon: "far fa-pencil"
  },
  {
    feature: "Transfer Clips",
    desc: "Transfer clips between folders",
    free: false,
    pro: true,
    icon: "far fa-exchange"
  },
  {
    feature: "Share Clips",
    desc: "Share clips between accounts/users",
    free: false,
    pro: true,
    icon: "far fa-share"
  }
];

const faq = [
  {
    question: "What is the payment method?",
    answer: "We accept payment via BTC or USDT"
  },
  {
    question: "What happens when I cancel my subscription?",
    answer: "You will be downgraded to the free plan and all your pro features will be disabled."
  },
  {
    question: "Do i get to keep my files if I cancel my subscription?",
    answer: "Yes, you will be able to keep your files but you will not be able to upload new files."
  }];

async function choosePlan(btn: ILoadingButton<"free" | "pro">) {
  const plan = btn.data;
  try {
    await $http.post("account/set-plan", {
      plan
    });
    await $router.push({ name: "clipboard" });
  } catch (res) {
    return alertRequestError(res);
  }
}
</script>