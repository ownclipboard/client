<script setup lang="ts">
/**
 * Plan page: current subscription, pending NowPayments invoices, the Free and
 * Pro plans with a comparison table, and the subscribe dialog.
 */
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http, alertRequestError } from "../http";
import { useRoute, useRouter } from "vue-router";
import { useAuthUser } from "../stores/auth.store";
import { refreshAuthData } from "../services/auth.service";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import type { InvoiceStatus, SubStat } from "../types/models.types";
import { $alert } from "../components/ws-alert/ws-alert";
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  CloudArrowUpIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  FolderIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  ServerStackIcon,
  ShareIcon,
  Square2StackIcon,
  XMarkIcon
} from "@heroicons/vue/20/solid";
import PageHeader from "../components/ui/PageHeader.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Dialog from "../components/ui/Dialog.vue";
import Select from "../components/ui/Select.vue";
import StorageSetupGuide from "../components/storage/StorageSetupGuide.vue";

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

const hasActiveSubscription = computed(() => !!authUser.subscription && !authUser.subscription.expired);
const isPro = computed(() => authUser.data?.plan === "pro");

const computedPrice = computed(() => {
  const price = subscribeForm.type === "monthly" ? MONTHLY_PRICE : YEARLY_PRICE;
  return price * subscribeForm.duration;
});

type PricingRow = {
  feature: string;
  /** One line, or several to put on their own lines. */
  desc?: string | string[];
  free: boolean | string;
  pro: boolean | string;
  icon: any;
  /** Adds a link to the storage setup guide under the description. */
  guide?: boolean;
};

const guideOpen = ref(false);

function descLines(row: PricingRow) {
  if (!row.desc) return [];
  return Array.isArray(row.desc) ? row.desc : [row.desc];
}

const pricing: PricingRow[] = [
  { feature: "Unlimited clips", free: true, pro: true, icon: Square2StackIcon },
  { feature: "Folders", free: "100", pro: "Unlimited", icon: FolderIcon },
  { feature: "Public paste", desc: "Share a folder link so anyone can paste into it", free: true, pro: true, icon: GlobeAltIcon },
  { feature: "Mobile app", desc: "iOS and Android", free: true, pro: true, icon: DevicePhoneMobileIcon },
  { feature: "Chrome extension", desc: "Paste from any page", free: true, pro: true, icon: PuzzlePieceIcon },
  { feature: "Encrypted folders", desc: "256-bit AES, encrypted in your browser", free: true, pro: true, icon: LockClosedIcon },
  { feature: "Devices", desc: "Api keys apps use to read and write your clips", free: "3", pro: "Unlimited", icon: CpuChipIcon },
  { feature: "File upload", desc: "Upload files into any folder", free: true, pro: true, icon: CloudArrowUpIcon },
  {
    feature: "File storage",
    desc: ["Free: connect your own owns3 server.", "Pro: we host your files for you, nothing to set up."],
    free: "Own server",
    pro: "Own server or hosted",
    icon: ServerStackIcon,
    guide: true
  },
  { feature: "Edit clips", desc: "Change a clip's title and content after saving", free: false, pro: true, icon: PencilSquareIcon },
  { feature: "Transfer clips", desc: "Move between folders, or copy to keep both", free: "Move", pro: "Move and copy", icon: ArrowsRightLeftIcon },
  { feature: "Share clips", desc: "Between accounts", free: false, pro: true, icon: ShareIcon }
];

const faq = [
  { question: "How do I pay?", answer: "With crypto (BTC, USDT and many more) through NowPayments. You are redirected to their invoice page and back here when done." },
  { question: "What happens when I cancel?", answer: "You are moved to the free plan and Pro features are disabled." },
  { question: "Do I keep my files if I cancel?", answer: "Files on your own owns3 server are untouched. Files we host stay put, but uploads pause until you renew Pro or connect your own server." }
];

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

const isInProgress = (sub: SubStat) => !!sub.invoice && IN_PROGRESS_STATUSES.includes(sub.invoice.status);
const isTerminal = (sub: SubStat) => !!sub.invoice && TERMINAL_STATUSES.includes(sub.invoice.status);

function subLabel(sub: SubStat) {
  const unit = sub.type === "yearly" ? "year" : "month";
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
let awaitingSubscription: string | null = null;

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  awaitingSubscription = null;
}

function evaluatePoll(res: SubscriptionResponse): { activated: boolean; keepPolling: boolean } {
  if (awaitingSubscription) {
    const activated = res.subscription?.publicId === awaitingSubscription && res.subscription.status === "active";
    if (activated) return { activated: true, keepPolling: false };
    const stillPending = res.pending.find((s) => s.publicId === awaitingSubscription);
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
      { plan: "pro", type: subscribeForm.type, duration: subscribeForm.duration }
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
    paymentNotice.value = { type: "success", text: "Payment received. Your subscription activates once the network confirms it." };
    awaitingSubscription = subscription || null;
  } else if (payment === "cancel") {
    paymentNotice.value = { type: "cancel", text: "Payment cancelled." };
  }

  if (payment || subscription || $route.query.NP_id) {
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

const proCta = computed(() => {
  if (hasPendingInvoice.value) return { label: "Payment pending", hint: "Complete or cancel it above" };
  if (hasActiveSubscription.value) return { label: "Extend Pro", hint: "Added to your current expiry" };
  if (authUser.subscription) return { label: "Subscribe to Pro", hint: MONTHLY_ENABLED ? "Monthly or yearly" : "Billed yearly" };
  return { label: "Try Pro free", hint: "1 month, no payment" };
});
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader title="Plan" description="Pro adds file storage we host for you, editing, copying between folders and sharing." />

    <!-- Payment notice -->
    <div
      v-if="paymentNotice"
      :class="[
        'mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        paymentNotice.type === 'success' ? 'border-accent/30 bg-accent-soft text-accent' : 'border-line bg-surface text-muted'
      ]"
    >
      <CheckIcon v-if="paymentNotice.type === 'success'" class="mt-0.5 h-4 w-4 shrink-0" />
      <InformationCircleIcon v-else class="mt-0.5 h-4 w-4 shrink-0" />
      <span class="flex-1">{{ paymentNotice.text }}</span>
      <button type="button" class="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss" @click="paymentNotice = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Current subscription -->
    <Card v-if="hasActiveSubscription && authUser.subscription" class="mb-5">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div class="text-[11px] font-medium uppercase tracking-wider text-faint">Current plan</div>
          <div class="mt-0.5 flex items-center gap-2 text-lg font-semibold text-fg">
            {{ authUser.data!.plan === "pro" ? "Pro" : "Free" }}
            <Badge variant="accent" uppercase>{{ authUser.subscription.type }}</Badge>
          </div>
        </div>
        <div>
          <div class="text-[11px] font-medium uppercase tracking-wider text-faint">{{ authUser.subscription.expired ? "Expired" : "Renews or expires" }}</div>
          <div class="mt-0.5 text-sm text-fg"><TimeAgo :date="authUser.subscription.expiresAt!" /></div>
        </div>
        <div v-if="authUser.subscription.amount">
          <div class="text-[11px] font-medium uppercase tracking-wider text-faint">Paid</div>
          <div class="mt-0.5 font-mono text-sm text-fg">${{ authUser.subscription.amount }}</div>
        </div>
      </div>
    </Card>

    <!-- Pending invoices -->
    <Card v-if="hasPendingInvoice" title="Pending payment" class="mb-5" :padded="false">
      <ul class="divide-y divide-line">
        <li v-for="sub in pending" :key="sub.publicId" class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-sm">
              <span class="font-semibold text-fg">Pro</span>
              <span class="text-muted">{{ subLabel(sub) }}</span>
              <span class="font-mono text-fg">${{ sub.amount }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <Badge :variant="isTerminal(sub) ? 'danger' : 'warn'">{{ invoiceLabel(sub.invoice?.status) }}</Badge>
              <ArrowPathIcon v-if="isInProgress(sub)" class="h-3.5 w-3.5 animate-spin text-faint" />
            </div>
            <p v-if="sub.invoice?.status === 'partially_paid'" class="text-xs text-muted">
              Partial payments are not activated automatically. Complete the payment on the invoice page or contact support.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button v-if="sub.invoice?.url && !isTerminal(sub)" variant="primary" size="sm" :href="sub.invoice.url">Continue payment</Button>
            <Button variant="danger" size="sm" :click="cancelPending" :data="sub.publicId" message="Cancelling">Cancel</Button>
          </div>
        </li>
      </ul>
    </Card>

    <!-- Plans -->
    <div class="grid gap-4 sm:grid-cols-2">
      <Card :padded="false" :class="!isPro ? 'ring-1 ring-accent/40' : ''">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-fg">Free</h2>
            <Badge v-if="authUser.data?.plan === 'free'" variant="accent">Current</Badge>
          </div>
          <div class="mt-3 text-3xl font-semibold tracking-tight text-fg">$0</div>
          <p class="mt-1 text-sm text-muted">Forever. Clips, folders, encryption, and file uploads to your own owns3 server.</p>
          <Button
            v-if="!hasActiveSubscription"
            class="mt-5"
            block
            :click="choosePlan"
            data="free"
            :disabled="authUser.data?.plan === 'free'"
            message="Switching"
          >
            {{ authUser.data?.plan === "free" ? "Your current plan" : "Use the free plan" }}
          </Button>
        </div>
      </Card>

      <Card :padded="false" :class="isPro ? 'ring-1 ring-accent/40' : ''">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-fg">Pro</h2>
            <Badge v-if="isPro" variant="accent">Current</Badge>
          </div>
          <div class="mt-3 flex items-baseline gap-1">
            <span class="text-3xl font-semibold tracking-tight text-fg">${{ YEARLY_PRICE }}</span>
            <span class="text-sm text-muted">/ year</span>
            <span v-if="MONTHLY_ENABLED" class="ml-2 text-sm text-muted">or ${{ MONTHLY_PRICE }} / month</span>
          </div>
          <p class="mt-1 text-sm text-muted">Everything in Free, plus file storage we host for you, editing, copying between folders and sharing.</p>
          <Button class="mt-5" variant="primary" block :click="choosePlan" data="pro" :disabled="hasPendingInvoice" message="One moment">
            {{ proCta.label }}
          </Button>
          <p class="mt-2 text-center text-xs text-faint">{{ proCta.hint }}</p>
        </div>
      </Card>
    </div>

    <!-- Comparison -->
    <div class="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[11px] uppercase tracking-wider text-faint">
            <th class="px-5 py-3 font-medium">Feature</th>
            <th class="w-28 px-3 py-3 font-medium">Free</th>
            <th class="w-28 px-3 py-3 font-medium text-accent">Pro</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="item in pricing" :key="item.feature">
            <td class="px-5 py-3">
              <div class="flex items-center gap-3">
                <component :is="item.icon" class="h-4 w-4 shrink-0 text-faint" />
                <div>
                  <div class="text-fg">{{ item.feature }}</div>
                  <div v-for="line in descLines(item)" :key="line" class="text-xs text-muted">{{ line }}</div>
                  <button
                    v-if="item.guide"
                    type="button"
                    class="mt-0.5 text-xs font-medium text-accent underline underline-offset-2"
                    @click="guideOpen = true"
                  >
                    How to connect your own storage
                  </button>
                </div>
              </div>
            </td>
            <td v-for="col in (['free', 'pro'] as const)" :key="col" class="px-3 py-3">
              <span v-if="typeof item[col] === 'string'" class="text-fg">{{ item[col] }}</span>
              <CheckIcon v-else-if="item[col]" class="h-4 w-4 text-accent" aria-label="Included" />
              <XMarkIcon v-else class="h-4 w-4 text-faint" aria-label="Not included" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- FAQ -->
    <section class="mt-8 grid gap-6 sm:grid-cols-3">
      <div v-for="item in faq" :key="item.question">
        <h3 class="text-sm font-medium text-fg">{{ item.question }}</h3>
        <p class="mt-1 text-sm text-muted">{{ item.answer }}</p>
      </div>
    </section>
  </div>

  <StorageSetupGuide :open="guideOpen" @close="guideOpen = false" />

  <!-- Subscribe dialog -->
  <Dialog :open="showPaymentModal" title="Subscribe to Pro" description="Paid in crypto through NowPayments. You'll be sent to their invoice page." @close="showPaymentModal = false">
    <form class="space-y-5" @submit.prevent>
      <div class="grid grid-cols-2 gap-3">
        <Select v-model.number="subscribeForm.duration" label="Duration">
          <option v-for="i in 5" :key="i" :value="i">{{ i }}</option>
        </Select>
        <Select v-model="subscribeForm.type" label="Billing">
          <option v-if="MONTHLY_ENABLED" value="monthly">{{ subscribeForm.duration > 1 ? "Months" : "Month" }}</option>
          <option value="yearly">{{ subscribeForm.duration > 1 ? "Years" : "Year" }}</option>
        </Select>
      </div>

      <div class="flex items-end justify-between rounded-md bg-sunken px-4 py-3">
        <div>
          <div class="text-[11px] font-medium uppercase tracking-wider text-faint">Total</div>
          <div class="text-2xl font-semibold tracking-tight text-fg">${{ computedPrice }}</div>
        </div>
        <span class="text-xs text-muted">Network fee not included</span>
      </div>

      <Button variant="primary" size="lg" block type="submit" :click="payNow" message="Creating invoice">Pay now</Button>
    </form>
  </Dialog>
</template>
