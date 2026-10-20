import { redirect } from "next/navigation";
import { checkAdminAuth } from "../actions";
import AdminLoginForm from "./admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const isAuthed = await checkAdminAuth();
  if (isAuthed) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030604] px-4 py-12 text-[#f3fff0]">
      <AdminLoginForm />
    </main>
  );
}
