import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { UserProvider } from "@/components/UserProvider";

export default async function ProtectedLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <UserProvider user={user}>
      <div className="app-shell">
        <Sidebar email={user.email} role={user.role} />
        <div className="main-content">
          {children}
        </div>
      </div>
    </UserProvider>
  );
}
