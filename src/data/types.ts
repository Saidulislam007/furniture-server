import type { Request } from "express";

export interface ManagerAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface FurniturePayload {
  title?: string;
  price?: number | string;
  oldPrice?: number | string;
  deliveryFee?: number | string;
  category?: string;
  subCategory?: string;
  stock?: number | string;
  material?: string;
  warranty?: string;
  description?: string;
  image?: string;
  dimensions?: unknown;
  colors?: unknown[];
  status?: string;
  managerId?: string;
  managerEmail?: string;
}
