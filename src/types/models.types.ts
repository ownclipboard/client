
export type OwnClip = {
  uuid: string;
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

export type SubStat = {
  type: Subscription["type"];
  status: Subscription["status"];
  duration: Subscription["duration"];
  expiresAt: Subscription["expiresAt"];
  expired: boolean;
}
