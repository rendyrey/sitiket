"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import OrderDetail from "@/features/admin/components/order-detail";
import { getOrderReviewAction, listEventOrdersAction } from "@/features/admin/lib/actions";
import { formatPrice } from "@/data/events";
import { formatEventDate, formatEventTime } from "@/features/events/lib/format";
import { OrderStatusBadge } from "@/features/orders/components";
import type { Order, OrderPayment, OrderStatus, RefundRequest } from "@/lib/api/types";

const STATUS_OPTIONS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending_payment", label: "Awaiting transfer" },
  { value: "awaiting_verification", label: "Verifying payment" },
  { value: "paid", label: "Paid" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refund_requested", label: "Refund requested" },
  { value: "refunded", label: "Refunded" },
  { value: "refund_rejected", label: "Refund rejected" },
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

type SortKey = "createdAt" | "buyerName";
type ReviewData = { payments: OrderPayment[]; refundRequests: RefundRequest[] };

/**
 * Server-driven orders table — search/status filter/sort/pagination all run
 * as an API call (via Server Actions) instead of loading every order into
 * the browser, so an event with thousands of orders stays cheap. Payment
 * proofs + refund actions are reviewed inline by expanding a row, fetched
 * only on demand.
 */
export default function OrderReviewPanel({ eventId }: { eventId: string }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoadingTransition] = useTransition();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewLoading, startReviewTransition] = useTransition();

  // Debounce the search box so every keystroke doesn't hit the API.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // `startTransition` (not a plain setState call) keeps `loading` derived from
  // React's own pending-transition tracking instead of a manual flag flipped
  // synchronously inside the effect.
  const fetchOrders = () => {
    startLoadingTransition(async () => {
      const result = await listEventOrdersAction(eventId, {
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
  }, [eventId, search, status, sortKey, sortDir, page]);

  const fetchReview = (orderId: string) => {
    startReviewTransition(async () => {
      const result = await getOrderReviewAction(orderId);
      if (!result.ok) return;
      setReview(result.data);
    });
  };

  const toggleExpand = (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      setReview(null);
      return;
    }
    setExpandedId(orderId);
    setReview(null);
    fetchReview(orderId);
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
        <label className="field-label">
          Status
          <select
            className="text-field mt-2 h-11"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus | "all");
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto border-2 border-ink bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b-2 border-ink bg-paper text-left text-[10px] font-black uppercase tracking-widest text-black/50">
            <tr>
              <SortableHeader label="Buyer" sortKey="buyerName" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Status</th>
              <SortableHeader label="Date" sortKey="createdAt" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <th className="p-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm font-semibold text-black/40">
                  No orders match these filters.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} expanded={expandedId === order.id} onToggle={() => toggleExpand(order.id)}>
                {expandedId === order.id &&
                  (reviewLoading || !review ? (
                    <p className="p-4 text-xs font-semibold text-black/40">Loading…</p>
                  ) : (
                    <OrderDetail
                      payments={review.payments}
                      refundRequests={review.refundRequests}
                      onChanged={() => {
                        fetchOrders();
                        fetchReview(order.id);
                      }}
                    />
                  ))}
              </OrderRow>
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

function OrderRow({
  children,
  expanded,
  onToggle,
  order,
}: {
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  order: Order;
}) {
  return (
    <>
      <tr className="border-b border-black/10">
        <td className="min-w-0 p-3">
          <p className="truncate font-black uppercase">{order.buyerName}</p>
          <p className="truncate text-xs text-black/40">{order.buyerEmail}</p>
        </td>
        <td className="p-3 text-right">{formatPrice(order.totalAmount)}</td>
        <td className="p-3 text-right">
          <OrderStatusBadge status={order.status} />
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
          <td colSpan={5} className="p-0">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}
