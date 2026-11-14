import { signOut } from "@/app/actions/auth";

export async function GET() {
  return signOut();
}