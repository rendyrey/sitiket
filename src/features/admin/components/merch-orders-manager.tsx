"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import SearchableSelect from "@/components/ui/searchable-select";
import { formatPrice } from "@/data/events";
import { formatEventDate, formatEventTime } from "@/features/events/lib/format";
import {
  approveMerchPaymentAction,
  getMerchOrderPaymentsAction,
  listSellingMerchOrdersAction,
  rejectMerchPaymentAction,
} from "@/features/admin/lib/actions";
import { MerchOrderStatusBadge } from "@/features/merch/components";
import type { MerchOrder, MerchOrderPayment, MerchOrderStatus } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

const STATUS_OPTIONS: Array<{ value: MerchOrderStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending_payment", label: "Awaiting transfer" },
  { value: "awaiting_verification", label: "Verifying payment" },
  { value: "paid", label: "Paid" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

type SortKey = "createdAt" | "buyerName";

/**
 * The seller's incoming merch orders — buyer + shipping details on every
 * row (the spec's "admin can see who's buying"), payment proofs reviewed
 * inline by expanding a row. Search/filter/sort/pagination run server-side,
 * mirroring the events orders table.
 */
export default function MerchOrdersManager() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MerchOrderStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<MerchOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoadingTransition] = useTransition();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<MerchOrderPayment[] | null>(null);
  const [paymentsLoading, startPaymentsTransition] = useTransition();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchOrders = () => {
    startLoadingTransition(async () => {
      const result = await listSellingMerchOrdersAction({
        search: search || undefined,
        status: status === "all" ? undefined : status,
        sortBy: sortKey,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setOrders(result.data.orders);
      setTotal(result.data.meta.total);
    });
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchOrders closes over the filter/sort/page state already listed below
  }, [search, status, sortKey, sortDir, page]);

  const fetchPayments = (orderId: string) => {
    startPaymentsTransition(async () => {
      const result = await getMerchOrderPaymentsAction(orderId);
      if (result.ok) setPayments(result.data);
    });
  };

  const toggleExpand = (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      setPayments(null);
      return;
    }
    setExpandedId(orderId);
    setPayments(null);
    fetchPayments(orderId);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by buyer name or email…"
          className="text-field mt-0 h-11 w-full max-w-xs"
        />
        <label className="field-label w-56 max-w-full">
          Status
          <SearchableSelect
            className="h-11"
            value={status}
            onChange={(value) => {
              setStatus(value as MerchOrderStatus | "all");
              setPage(1);
            }}
            options={STATUS_OPTIONS}
          />
        </label>
      </div>

      <div className="overflow-x-auto border-2 border-ink bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b-2 border-ink bg-paper text-left text-[10px] font-black uppercase tracking-widest text-black/50">
            <tr>
              <SortableHeader label="Buyer" sortKey="buyerName" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="p-3">Items</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Status</th>
              <SortableHeader label="Date" sortKey="createdAt" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <th className="p-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm font-semibold text-black/40">
                  No merch orders match these filters.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <MerchOrderRow key={order.id} order={order} expanded={expandedId === order.id} onToggle={() => toggleExpand(order.id)}>
                {expandedId === order.id && (
                  <MerchOrderDetail
                    order={order}
                    payments={payments}
                    loading={paymentsLoading}
                    onChanged={() => {
                      fetchOrders();
                      fetchPayments(order.id);
                    }}
                  />
                )}
              </MerchOrderRow>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-4 text-center text-xs font-semibold text-black/40">Loading…</p>}
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-black/50">
        <p>
          {total} {total === 1 ? "order" : "orders"} · Page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="button button-dark disabled:opacity-40">
            Prev
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="button button-dark disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  activeKey,
  align = "left",
  dir,
  label,
  onSort,
  sortKey,
}: {
  activeKey: SortKey;
  align?: "left" | "right";
  dir: "asc" | "desc";
  label: string;
  onSort: (key: SortKey) => void;
  sortKey: SortKey;
}) {
  return (
    <th className={`p-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1.5 hover:text-black">
        {label}
        <span className="text-black/30">{activeKey === sortKey ? (dir === "asc" ? "▲" : "▼") : "▴▾"}</span>
      </button>
    </th>
  );
}

function MerchOrderRow({
  children,
  expanded,
  onToggle,
  order,
}: {
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  order: MerchOrder;
}) {
  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return (
    <>
      <tr className="border-b border-black/10">
        <td className="min-w-0 p-3">
          <p className="truncate font-black uppercase">{order.buyerName}</p>
          <p className="truncate text-xs text-black/40">{order.buyerEmail}</p>
        </td>
        <td className="p-3 text-xs text-black/60">
          {order.items?.slice(0, 2).map((item) => (
            <p key={item.id} className="truncate">
              {item.quantity}× {item.productName}
              {item.variantLabel ? ` (${item.variantLabel})` : ""}
            </p>
          ))}
          {(order.items?.length ?? 0) > 2 && <p className="text-black/35">+{(order.items?.length ?? 0) - 2} more</p>}
          {itemCount === 0 && "—"}
        </td>
        <td className="p-3 text-right">{formatPrice(order.totalAmount)}</td>
        <td className="p-3 text-right">
          <MerchOrderStatusBadge status={order.status} />
        </td>
        <td className="p-3 text-right">
          <p className="font-bold">{formatEventDate(order.createdAt)}</p>
          <p className="text-xs text-black/40">{formatEventTime(order.createdAt)}</p>
        </td>
        <td className="p-3 text-right">
          <button type="button" onClick={onToggle} className="text-xs font-black uppercase text-link hover:underline">
            {expanded ? "Hide" : "Review"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-black/10">
          <td colSpan={6} className="p-0">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}

function MerchOrderDetail({
  loading,
  onChanged,
  order,
  payments,
}: {
  loading: boolean;
  onChanged: () => void;
  order: MerchOrder;
  payments: MerchOrderPayment[] | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.message ?? "Something went wrong.");
      return;
    }
    onChanged();
  };

  return (
    <div className="space-y-4 bg-paper p-4">
      {/* Buyer + shipping — everything the seller needs to fulfil the order. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-2 border-black/10 bg-white p-3 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Buyer</span>
          <p className="mt-1 font-bold">{order.buyerName}</p>
          <p className="text-black/55">{order.buyerEmail}</p>
          <p className="text-black/55">{order.buyerPhone}</p>
        </div>
        <div className="border-2 border-black/10 bg-white p-3 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Ship to</span>
          <p className="mt-1 text-black/70">
            {[
              order.shippingAddress,
              order.shippingVillage,
              order.shippingDistrict,
              order.shippingCity,
              order.shippingProvince,
              order.shippingPostalCode,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          {order.courierName && (
            <p className="mt-1 font-bold text-black/70">
              {order.courierName} — {formatPrice(order.shippingCost)}
              {order.shippingEstimation ? ` (est. ${order.shippingEstimation})` : ""}
              {order.shippingWeightGrams ? ` · ${order.shippingWeightGrams} g` : ""}
            </p>
          )}
          {order.buyerNote && <p className="mt-1 italic text-black/50">“{order.buyerNote}”</p>}
        </div>
      </div>

      {/* Full item list */}
      <div className="border-2 border-black/10 bg-white p-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Items</span>
        <ul className="mt-1 space-y-1 text-xs">
          {order.items?.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.quantity}× {item.productName}
                {item.variantLabel ? ` (${item.variantLabel})` : ""}
              </span>
              <span className="font-bold">{formatPrice(item.subtotal)}</span>
            </li>
          ))}
          {order.shippingCost > 0 && (
            <li className="flex justify-between gap-3 border-t border-black/10 pt-1">
              <span>Shipping{order.courierName ? ` (${order.courierName})` : ""}</span>
              <span className="font-bold">{formatPrice(order.shippingCost)}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Payment proofs */}
      {loading || payments === null ? (
        <p className="text-xs font-semibold text-black/40">Loading payments…</p>
      ) : payments.length === 0 ? (
        <p className="text-xs font-semibold text-black/40">No payment proof submitted yet.</p>
      ) : (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Payment proofs</span>
          {payments.map((payment) => (
            <div key={payment.id} className="flex flex-wrap items-center gap-4 border-2 border-black/10 bg-white p-3">
              <a href={toAssetUrl(payment.proofImageUrl)} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- payment proofs are user-uploaded originals, not app assets to optimize */}
                <img src={toAssetUrl(payment.proofImageUrl)} alt="Payment proof" className="h-20 w-20 border-2 border-ink object-cover" />
              </a>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase">{payment.status}</span>
                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-black/40">
                  {payment.method === "qris" ? "QRIS" : "Bank transfer"} · {formatPrice(payment.amount)}
                </span>
                {payment.transferNote && <p className="mt-1 truncate text-xs text-black/50">{payment.transferNote}</p>}
              </div>
              {payment.status === "pending_review" && (
                <div className="flex gap-2">
                  <button type="button" disabled={pending} onClick={() => void run(() => approveMerchPaymentAction(payment.id))} className="button button-lime">
                    Approve
                  </button>
                  <button type="button" disabled={pending} onClick={() => void run(() => rejectMerchPaymentAction(payment.id))} className="button button-dark">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
