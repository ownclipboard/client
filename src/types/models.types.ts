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
