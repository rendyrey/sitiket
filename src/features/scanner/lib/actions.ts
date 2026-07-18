"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult } from "@/lib/api/action-result";
import type { ScanTicketRequest, ScanTicketResult } from "@/lib/api/types";

export async function scanTicketAction(input: ScanTicketRequest) {
  return toActionResult(() => apiFetch<ScanTicketResult>("/api/check-ins/scan", { method: "POST", body: input }));
}
