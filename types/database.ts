export type UserRole = "owner" | "staff";

export type Pharmacy = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type AppUser = {
  id: string;
  pharmacy_id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};