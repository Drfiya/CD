export type Definition = {
  id: string;
  key: string;
  type: string | null;
  label: string;
  description: string;
  emoji: string;
  iconUrl: string | null;
  colorHex: string;
  condition: string;
  sortOrder: number;
  isActive: boolean;
  _count: { badges: number };
};

export type Member = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export const DESCRIPTION_MAX = 280;
