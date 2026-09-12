<script setup lang="ts">
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http, alertRequestError } from "../http";
import { useRoute, useRouter } from "vue-router";
import { useAuthUser } from "../stores/auth.store";
import { refreshAuthData } from "../services/auth.service";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import Modal from "../components/Modal.vue";
import type { InvoiceStatus, SubStat } from "../types/models.types";
import { $alert } from "../components/ws-alert/ws-alert";

const $router = useRouter();
const $route = useRoute();
const authUser = useAuthUser();
const showPaymentModal = ref(false);
const MONTHLY_PRICE = 2;
const YEARLY_PRICE = 20;
// Monthly subscriptions are disabled for now, only yearly is offered. Flip this to re-enable.
const MONTHLY_ENABLED = false;

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
    answer: "We accept crypto payments (BTC, USDT and many more) through NowPayments."
  },
  {
    question: "What happens when I cancel my subscription?",
    answer: "You will be downgraded to the free plan and all your pro features will be disabled."
  },
  {
    question: "Do i get to keep my files if I cancel my subscription?",
    answer: "Yes, you will be able to keep your files but you will not be able to upload new files."
  }];

/* ---------------- Subscription state & NowPayments ---------------- */

type SubscriptionResponse = { subscription: SubStat | null; pending: SubStat[] };
type SubscribeResponse = { subscription: SubStat; invoice: NonNullable<SubStat["invoice"]>; message: string };

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  pending: "Awaiting payment",
  waiting: "Waiting for your transfer",
  confirming: "Confirming on the network",
  confirmed: "Confirmed, finalising",
  sending: "Confirmed, finalising",
  partially_paid: "Partially paid, send the remaining amount",
  finished: "Paid",
  failed: "Payment failed",
  expired: "Payment window expired, start a new payment",
  refunded: "Refunded"
};

const IN_PROGRESS_STATUSES: InvoiceStatus[] = ["waiting", "confirming", "confirmed", "sending", "partially_paid"];
const TERMINAL_STATUSES: InvoiceStatus[] = ["failed", "expired", "refunded"];

const POLL_INTERVAL_MS = 15_000;
const POLL_MAX_MS = 10 * 60_000;

const pending = computed(() => authUser.pending);
const hasPendingInvoice = computed(() => pending.value.length > 0);
const paymentNotice = ref<{ type: "success" | "cancel"; text: string } | null>(null);

function invoiceLabel(status?: InvoiceStatus) {
  return status ? INVOICE_LABELS[status] ?? status : "Awaiting payment";
}

function isInProgress(sub: SubStat) {
  return !!sub.invoice && IN_PROGRESS_STATUSES.includes(sub.invoice.status);
}

function isTerminal(sub: SubStat) {
  return !!sub.invoice && TERMINAL_STATUSES.includes(sub.invoice.status);
}

function subLabel(sub: SubStat) {
  const unit = sub.type === "yearly" ? "Year" : "Month";
  return `${sub.duration} ${unit}${sub.duration > 1 ? "s" : ""}`;
}

async function loadSubscription() {
  const res = await $http.get<any, SubscriptionResponse>("account/subscription");
  authUser.pending = res.pending || [];
  if (res.subscription) authUser.subscription = res.subscription;
  return res;
}

/* ---------------- Polling ---------------- */

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollStartedAt = 0;
// publicId of the subscription we came back from NowPayments for (if any).
let awaitingSubscription: string | null = null;

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  awaitingSubscription = null;
}

/**
 * Decide whether polling should continue after a fresh `account/subscription` result.
 * `activated` is true when the subscription we came back for is now active.
 */
function evaluatePoll(res: SubscriptionResponse): { activated: boolean; keepPolling: boolean } {
  if (awaitingSubscription) {
    const activated = res.subscription?.publicId === awaitingSubscription && res.subscription.status === "active";
    if (activated) return { activated: true, keepPolling: false };

    const stillPending = res.pending.find((s) => s.publicId === awaitingSubscription);
    // Gone from pending but not active: it was cancelled or superseded. Nothing to wait for.
    if (!stillPending) return { activated: false, keepPolling: false };
    return { activated: false, keepPolling: !isTerminal(stillPending) };
  }

  return { activated: false, keepPolling: res.pending.some(isInProgress) };
}

function startPolling() {
  if (pollTimer) return;
  pollStartedAt = Date.now();

  pollTimer = setInterval(async () => {
    if (Date.now() - pollStartedAt > POLL_MAX_MS) return stopPolling();

    try {
      const res = await loadSubscription();
      const { activated, keepPolling } = evaluatePoll(res);

      if (activated) {
        await refreshAuthData(authUser);
        paymentNotice.value = null;
        $alert.success("Your subscription is now active.");
      }
      if (!keepPolling) stopPolling();
    } catch {
      // transient error, try again on the next tick
    }
  }, POLL_INTERVAL_MS);
}

/* ---------------- Actions ---------------- */

function closePaymentModal() {
  showPaymentModal.value = false;
}

async function choosePlan(btn: ILoadingButton<"free" | "pro">) {
  const plan = btn.data;

  // Users who already had a subscription (trial used) pay via NowPayments.
  if (plan === "pro" && authUser.subscription) {
    btn.stopLoading();
    showPaymentModal.value = true;
    return;
  }

  try {
    await $http.post("account/set-plan", { plan });
    await refreshAuthData(authUser);
    await $router.push({ name: "clipboard" });
  } catch (res) {
    btn.stopLoading();
    return alertRequestError(res);
  }
}

function payNow(btn: ILoadingButton) {
  if (!MONTHLY_ENABLED) subscribeForm.type = "yearly";

  return $http
    .post<any, SubscribeResponse>(
      "account/subscribe",
      { plan: "pro", type: subscribeForm.type, duration: subscribeForm.duration },
      // Creating the invoice calls NowPayments upstream, so allow more than the default 1s timeout.
      { timeout: 30_000 }
    )
    .then((res) => {
      if (res.invoice?.url) {
        window.location.href = res.invoice.url;
        return;
      }
      $alert.error("Invoice created but no payment link was returned. Please try again.");
      btn.stopLoading();
    })
    .catch((res) => {
      if (res?.response) alertRequestError(res);
      else $alert.error("Could not reach the payment service. Please try again.");
      btn.stopLoading();
    });
}

function cancelPending(btn: ILoadingButton<string>) {
  return $http
    .post("account/subscription/cancel", { subscription: btn.data })
    .then(() => loadSubscription())
    .then((res) => {
      if (!evaluatePoll(res).keepPolling) stopPolling();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/* ---------------- Lifecycle ---------------- */

onMounted(async () => {
  const payment = $route.query.payment as string | undefined;
  const subscription = $route.query.subscription as string | undefined;

  if (payment === "success") {
    paymentNotice.value = {
      type: "success",
      text: "Payment received, your subscription will activate once the network confirms it."
    };
    awaitingSubscription = subscription || null;
  } else if (payment === "cancel") {
    paymentNotice.value = { type: "cancel", text: "Payment cancelled." };
  }

  if (payment || subscription || $route.query.NP_id) {
    // NowPayments also appends its own NP_id param; drop all of them.
    const { payment: _p, subscription: _s, NP_id: _n, ...query } = $route.query;
    await $router.replace({ query });
  }

  try {
    const res = await loadSubscription();
    const { activated, keepPolling } = evaluatePoll(res);
    if (activated) {
      await refreshAuthData(authUser);
      paymentNotice.value = null;
    } else if (keepPolling || payment === "success") {
      startPolling();
    }
  } catch (res) {
    alertRequestError(res);
  }
});

onBeforeUnmount(stopPolling);
</script>

<template>
  <div>
    <div class="text-4xl font-bold text-green-400 text-left mb-3">
      Pricing
    </div>

    <debug :data="{subscription: authUser.subscription, pending: authUser.pending}" />

    <div
      v-if="paymentNotice"
      class="my-4 p-3 rounded border flex items-start space-x-3"
      :class="paymentNotice.type === 'success' ? 'border-green-700 bg-green-900/30' : 'border-gray-700 bg-gray-900'">
      <i
        class="mt-1"
        :class="paymentNotice.type === 'success' ? 'fas fa-check-circle text-green-400' : 'fas fa-info-circle text-gray-400'"></i>
      <span class="flex-1">{{ paymentNotice.text }}</span>
      <button type="button" class="text-gray-500 hover:text-gray-300" @click="paymentNotice = null">
        <i class="fas fa-times"></i>
      </button>
    </div>

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

    <div v-if="hasPendingInvoice" class="my-5">
      <div class="text-xl font-bold text-yellow-400 mb-2">Pending payment</div>
      <div
        v-for="sub in pending"
        :key="sub.publicId"
        class="p-3 mb-3 rounded border border-gray-800 bg-gray-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex flex-col space-y-1">
          <div class="space-x-2">
            <b class="uppercase text-teal-400">{{ sub.plan }}</b>
            <span>{{ subLabel(sub) }}</span>
            <span class="text-gray-400">({{ sub.type }})</span>
            <b class="text-green-400">${{ sub.amount }}</b>
          </div>
          <div class="text-sm space-x-2">
            <span class="text-gray-400">Status:</span>
            <span :class="isTerminal(sub) ? 'text-red-400' : 'text-yellow-300'">{{ invoiceLabel(sub.invoice?.status) }}</span>
            <i v-if="isInProgress(sub)" class="fa fa-slash fa-spin text-gray-500"></i>
          </div>
          <div v-if="sub.invoice?.status === 'partially_paid'" class="text-sm text-gray-400">
            Partial payments are not activated automatically. Complete the payment on the invoice page or contact support.
          </div>
        </div>
        <div class="flex items-center space-x-3 text-sm font-medium">
          <a
            v-if="sub.invoice?.url && !isTerminal(sub)"
            :href="sub.invoice.url"
            class="px-3 py-2 rounded bg-green-300 hover:bg-green-400 text-gray-800">
            Continue payment
          </a>
          <LoadingButton
            :click="cancelPending"
            :data="sub.publicId"
            message="Cancelling"
            icon="fa fa-slash fa-spin mr-1"
            class="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-red-300">
            Cancel
          </LoadingButton>
        </div>
      </div>
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
            <template v-if="MONTHLY_ENABLED">
              <b class="text-lg">${{ MONTHLY_PRICE }}/month</b>
              <br>
            </template>
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
            <template v-if="MONTHLY_ENABLED">
              <b class="text-lg">${{ MONTHLY_PRICE }}/month</b>
              <br>
            </template>
            <b class="text-green-500 text-lg">${{ YEARLY_PRICE }}/Year</b>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-5 flex items-center justify-center space-x-10 text-xl font-medium">
      <LoadingButton
        v-if="!hasActiveSubscription"
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
        :disabled="hasPendingInvoice"
        class="flex flex-col pl-3 bg-gray-900 hover:bg-gray-950 py-2 rounded w-full disabled:opacity-60 disabled:cursor-not-allowed">
        <template v-if="hasPendingInvoice">
          <span class="text-yellow-400">Payment pending</span>
          <small class="text-sm">Complete or cancel it above</small>
        </template>
        <template v-else-if="hasActiveSubscription">
          <span class="text-green-500">Extend Pro</span>
          <small class="text-sm">Added to your current expiry</small>
        </template>
        <template v-else-if="authUser.subscription">
          <span class="text-green-500">Pro</span>
          <small class="text-sm">{{ MONTHLY_ENABLED ? "Monthly/Yearly" : "Yearly" }}</small>
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
          <div>We accept payment via <a href="https://nowpayments.io" target="_blank" rel="noopener"
                                        class="text-antiquewhite font-medium">NowPayments</a>, a payment gateway that
            supports your favorite cryptocurrencies. You will be redirected to their secure invoice page.
          </div>
          <form class="form my-5" @submit.prevent>
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
                  <option v-if="MONTHLY_ENABLED" value="monthly">{{ subscribeForm.duration > 1 ? "Months" : "Month" }}</option>
                  <option value="yearly">{{ subscribeForm.duration > 1 ? "Years" : "Year" }}</option>
                </select>
              </div>
            </div>

            <div class="mt-10 flex flex-col space-y-1">
              <span class="text-2xl font-bold">Total: <span class="font-bold text-green-400 ml-1">${{ computedPrice
                }}</span> </span>
              <span class="text-sm text-gray-400">Network fee NOT included</span>
            </div>

            <div>
              <LoadingButton
                type="submit"
                :click="payNow"
                message="Creating invoice"
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

