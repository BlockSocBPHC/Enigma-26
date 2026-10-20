import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkAdminAuth, getAdminCompetitionData } from "./actions";
import AdminView from "./admin-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuthed = await checkAdminAuth();
  if (!isAuthed) {
    redirect("/admin/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { state, teams } = await getAdminCompetitionData();

  return (
    <AdminView
      initialState={state}
      initialTeams={teams}
      userEmail={user.email || ""}
    />
  );
}
