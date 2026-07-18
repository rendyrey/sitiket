"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateUserStatusAction } from "@/features/super-admin/lib/actions";
import type { User } from "@/lib/api/types";

export default function UsersManager({ users }: { users: User[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const handleToggleStatus = async (user: User) => {
    setPending(user.id);
    await updateUserStatusAction(user.id, user.status === "active" ? "suspended" : "active");
    setPending(null);
    router.refresh();
  };

  return (
    <div className="overflow-x-auto border-2 border-ink bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b-2 border-ink bg-paper text-left text-[10px] font-black uppercase tracking-widest text-black/50">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Status</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-black/10">
              <td className="p-3 font-bold">{user.name}</td>
              <td className="p-3 text-black/60">{user.email}</td>
              <td className="p-3 uppercase">{user.role}</td>
              <td className="p-3">
                <span className={`text-xs font-black uppercase ${user.status === "active" ? "text-black" : "text-red-600"}`}>{user.status}</span>
              </td>
              <td className="p-3 text-right">
                <button
                  type="button"
                  disabled={pending === user.id}
                  onClick={() => void handleToggleStatus(user)}
                  className="text-xs font-black uppercase text-black/60 hover:text-black hover:underline disabled:opacity-50"
                >
                  {user.status === "active" ? "Suspend" : "Reactivate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
