export type OwnClip = {
  uuid: string;
  title: string;
  type: "text";
  folder: string;
  context: string;
  locked: boolean;
  favorite: boolean;
  updatedAt: string;
};

export type OwnFolder = {
  name: string;
  slug: string;
  contents: number;
};
