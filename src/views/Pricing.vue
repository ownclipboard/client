<script setup lang="ts">
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http, alertRequestError } from "../http";
import { useRouter } from "vue-router";
import { useAuthUser } from "../stores/auth.store";
import { refreshAuthData } from "../services/auth.service";
import { computed, reactive, ref } from "vue";
import Modal from "../components/Modal.vue";

const $router = useRouter();
const authUser = useAuthUser();
const showPaymentModal = ref(false);
const MONTHLY_PRICE = 2;
const YEARLY_PRICE = 20;

const subscribeForm = reactive({
  type: "yearly" as "monthly" | "yearly",
  duration: 1
});

const hasActiveSubscription = computed(() => authUser.subscription && !authUser.subscription.expired);


const computedPrice = computed(() => {
  const price = subscribeForm.type === "monthly" ? MONTHLY_PRICE : YEARLY_PRICE;
  return price * subscribeForm.duration;
});

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

function closePaymentModal() {
  showPaymentModal.value = false;
}

async function choosePlan(btn: ILoadingButton<"free" | "pro">) {
  if (authUser.subscription) {
    showPaymentModal.value = true;
    return;
  }

  const plan = btn.data;
  try {
    await $http.post("account/set-plan", { plan });
    await refreshAuthData(authUser);
    await $router.push({ name: "clipboard" });
  } catch (res) {
    return alertRequestError(res);
  }
}
</script>

<template>
  <div>
    <div class="text-4xl font-bold text-green-400 text-left mb-3">
      Pricing
    </div>

    <debug :data="{subscription: authUser.subscription}" />

    <div v-if="hasActiveSubscription" class="flex flex-col my-5 text-lg">
      <div class="space-x-2">
        <span>Current Plan:</span>
        <b class="uppercase text-teal-400">{{ authUser.data!.plan }}</b>
        <span>({{ authUser.subscription!.type.toUpperCase() }})</span>
      </div>

      <template v-if="authUser.subscription">
        <div class="space-x-2">
          <span>{{ authUser.subscription.expired ? "Expired" : "Expires" }}:</span>
          <TimeAgo :date="authUser.subscription.expiresAt" class="text-teal-400"></TimeAgo>
        </div>
      </template>
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
            <b class="text-lg">${{ MONTHLY_PRICE }}/month</b>
            <br>
            <b class="text-green-500 text-lg">${{ YEARLY_PRICE }}/Year</b>
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
            <b class="text-lg">${{ MONTHLY_PRICE }}/month</b>
            <br>
            <b class="text-green-500 text-lg">${{ YEARLY_PRICE }}/Year</b>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!hasActiveSubscription" class="mt-5 flex items-center justify-center space-x-10 text-xl font-medium">
      <LoadingButton
        :click="choosePlan"
        data="free"
        :disabled="authUser.data!.plan === 'free'"
        class="flex flex-col pl-3 bg-gray-900 hover:bg-gray-950 py-2 rounded w-full">
        <span class="text-green-500">Free!</span>
        <small class="text-sm">Forever</small>
      </LoadingButton>

      <LoadingButton
        :click="choosePlan"
        data="pro"
        :disabled="hasActiveSubscription"
        class="flex flex-col pl-3 bg-gray-900 hover:bg-gray-950 py-2 rounded w-full">
        <template v-if="authUser.subscription">
          <span class="text-green-500">Pro</span>
          <small class="text-sm">Monthly/Yearly</small>
        </template>
        <template v-else>
          <span class="text-green-500">Try Pro!</span>
          <small class="text-sm">7 Days</small>
        </template>
      </LoadingButton>
    </div>
  </div>

  <Modal v-if="showPaymentModal" max-size="max-w-5xl" @closeModal="closePaymentModal">
    <div>
      <div class="text-xl p-3 border-b border-gray-800 text-green-400 font-bold">
        Subscribe
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="col-span-1 p-3">
          <div>We accept payment via <a href="https://cryptomus.com" target="_blank"
                                        class="text-antiquewhite font-medium">Cryptomus</a> a payment gateway that
            supports your favorite cryptocurrencies.
          </div>
          <form class="form my-5">
            <div class="flex space-x-2">
              <div>
                <select v-model="subscribeForm.duration" class="text-xl">
                  <template v-for="i in 5">
                    <option :value="i">{{ i }}</option>
                  </template>
                </select>
              </div>

              <div>
                <select v-model="subscribeForm.type" class="text-xl">
                  <option value="monthly">{{ subscribeForm.duration > 1 ? "Months" : "Month" }}</option>
                  <option value="yearly">{{ subscribeForm.duration > 1 ? "Years" : "Year" }}</option>
                </select>
              </div>
            </div>

            <div class="mt-10 flex flex-col space-y-1">
              <span class="text-2xl font-bold">Total: <span class="font-bold text-green-400 ml-1">${{ computedPrice
                }}</span> </span>
              <span class="text-sm text-gray-400">%5 Fee NOT included</span>
            </div>

            <div>
              <LoadingButton
                type="submit"
                message="Loading"
                class="mt-5 font-bold text-2xl bg-green-300 hover:bg-green-400 text-gray-800 w-full p-3 rounded"
                icon="fa fa-slash fa-spin mr-3">
                Pay Now
              </LoadingButton>
            </div>

          </form>
        </div>
        <div class="col-span-1 p-3">
          <div class="text-xl font-bold text-green-400">FAQ</div>
          <div>
            <div v-for="item in faq" :key="item.question" class="my-2">
              <div class="text-lg">{{ item.question }}</div>
              <div class="text-gray-400">{{ item.answer }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

