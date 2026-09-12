
export type OwnClip = {
  publicId: string;
  title: string;
  type: "text";
  folder: string;
  context: string;
  locked: boolean;
  favorite: boolean;
  encrypted: boolean;
  decrypted?: boolean;
  updatedAt: string;
};

export type OwnFolder = {
  name: string;
  slug: string;
  contents: number; // number of clips in this folder
  visibility: "public" | "private" | "encrypted";
  publicPaste?: { id: string; date: string };
  hasPassword?: boolean;
};


export interface Subscription {
  _id: string;
  type: "trial" | "monthly" | "yearly";
  createdAt: Date;
  userId: string;
  plan: "pro";
  amount: number;
  status: "pending" | "active" | "cancelled";
  duration: number;
  expiresAt: Date;
}

export type InvoiceStatus =
  | "pending"
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired";

export type SubInvoice = {
  provider: "nowpayments";
  id: string;
  url?: string;
  status: InvoiceStatus;
  updatedAt?: string;
};

export type SubStat = {
  publicId: string;
  plan: Subscription["plan"];
  type: Subscription["type"];
  status: Subscription["status"];
  amount: number; // USD
  duration: Subscription["duration"];
  createdAt: string;
  startsAt?: string;
  expiresAt?: string;
  expired: boolean;
  invoice?: SubInvoice;
};
