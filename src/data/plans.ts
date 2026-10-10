/**
 * What the two plans cost and what each one includes. Shared by the public
 * pricing page and the signed-in plan page so the two cannot drift apart.
 */
import {
  ArrowsRightLeftIcon,
  CloudArrowUpIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  FolderIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  ServerStackIcon,
  ShareIcon,
  Square2StackIcon,
  UserGroupIcon
} from "@heroicons/vue/20/solid";

/** Months of Pro a first-time account gets free, set by the api on set-plan. */
export const TRIAL_MONTHS = 6;

export const MONTHLY_PRICE = 2;
export const YEARLY_PRICE = 20;

export type PlanRow = {
  feature: string;
  /** One line, or several to put on their own lines. */
  desc?: string | string[];
  free: boolean | string;
  pro: boolean | string;
  icon: any;
  /** Adds a link to the storage setup guide under the description. */
  guide?: boolean;
};

export const PLAN_ROWS: PlanRow[] = [
  { feature: "Unlimited clips", free: true, pro: true, icon: Square2StackIcon },
  { feature: "Folders", free: "100", pro: "Unlimited", icon: FolderIcon },
  { feature: "Public paste", desc: "Share a folder link so anyone can paste into it", free: true, pro: true, icon: GlobeAltIcon },
  { feature: "Mobile app", desc: "iOS and Android", free: true, pro: true, icon: DevicePhoneMobileIcon },
  { feature: "Chrome extension", desc: "Paste from any page", free: true, pro: true, icon: PuzzlePieceIcon },
  { feature: "Encrypted folders", desc: "256-bit AES, encrypted in your browser", free: true, pro: true, icon: LockClosedIcon },
  { feature: "Devices", desc: "Api keys apps use to read and write your clips", free: "3", pro: "Unlimited", icon: CpuChipIcon },
  { feature: "Spaces", desc: "A clipboard shared with other people", free: "2 you own", pro: "Unlimited", icon: UserGroupIcon },
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

export const PLAN_FAQ = [
  {
    question: "How do I pay?",
    answer:
      "With crypto (BTC, USDT and many more) through NowPayments. You are redirected to their invoice page and back here when done."
  },
  { question: "What happens when I cancel?", answer: "You are moved to the free plan and Pro features are disabled." },
  {
    question: "Do I keep my files if I cancel?",
    answer:
      "Files on your own owns3 server are untouched. Files we host stay put, but uploads pause until you renew Pro or connect your own server."
  }
];

export function planRowLines(row: PlanRow) {
  if (!row.desc) return [];
  return Array.isArray(row.desc) ? row.desc : [row.desc];
}
