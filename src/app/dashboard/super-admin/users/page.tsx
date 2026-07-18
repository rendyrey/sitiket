import type { Metadata } from "next";
import UsersManager from "@/features/super-admin/components/users-manager";
import { listUsers } from "@/features/super-admin/lib/api";

export const metadata: Metadata = { title: "Users" };

export default async function SuperAdminUsersPage() {
  const { users, total } = await listUsers();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Users</h1>
      <p className="mt-2 text-sm text-black/50">{total} accounts across the platform.</p>
      <div className="mt-8">
        <UsersManager users={users} />
      </div>
    </div>
  );
}
