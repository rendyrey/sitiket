"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
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

  const columns: DataTableColumn<User>[] = [
    {
      key: "name",
      header: "Name",
      sortAccessor: (user) => user.name.toLowerCase(),
      searchAccessor: (user) => user.name,
      render: (user) => <span className="font-bold">{user.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortAccessor: (user) => user.email.toLowerCase(),
      searchAccessor: (user) => user.email,
      render: (user) => <span className="text-black/60">{user.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      sortAccessor: (user) => user.role,
      searchAccessor: (user) => user.role,
      render: (user) => <span className="uppercase">{user.role}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortAccessor: (user) => user.status,
      searchAccessor: (user) => user.status,
      render: (user) => (
        <span className={`text-xs font-black uppercase ${user.status === "active" ? "text-black" : "text-red-600"}`}>
          {user.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (user) => (
        <button
          type="button"
          disabled={pending === user.id}
          onClick={() => void handleToggleStatus(user)}
          className="text-xs font-black uppercase text-black/60 hover:text-black hover:underline disabled:opacity-50"
        >
          {user.status === "active" ? "Suspend" : "Reactivate"}
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      getRowKey={(user) => user.id}
      searchPlaceholder="Search by name, email, or role…"
      emptyMessage="No users yet."
    />
  );
}
