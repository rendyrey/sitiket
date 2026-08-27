"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/data/events";
import { replaceProductVariantsAction } from "@/features/admin/lib/actions";
import type { ProductDetail } from "@/lib/api/types";

const MAX_GROUPS = 3;
const MAX_OPTIONS_PER_GROUP = 20;

type GroupDraft = { name: string; options: string[] };
type RowDraft = { options: string[]; price: string; stock: string; isActive: boolean };

const comboKey = (options: string[]) => options.join(" / ");

/** Cartesian product of every group's options → one row per combination. */
const buildCombinations = (groups: GroupDraft[]): string[][] =>
  groups.reduce<string[][]>((combos, group) => combos.flatMap((combo) => group.options.map((option) => [...combo, option])), [[]]);

/** Recomputes the matrix for the given groups, preserving values of surviving combinations. */
const syncRows = (groups: GroupDraft[], previous: RowDraft[], defaultPrice: number): RowDraft[] => {
  if (groups.length === 0 || groups.some((group) => group.options.length === 0)) return [];
  const byKey = new Map(previous.map((row) => [comboKey(row.options), row]));
  return buildCombinations(groups).map((options) => {
    const existing = byKey.get(comboKey(options));
    return existing
      ? { ...existing, options }
      : { options, price: String(defaultPrice), stock: "0", isActive: true };
  });
};

/**
 * Shopee/Tokopedia-style variant matrix editor: define up to 3 option groups
 * (Color, Size, …), and every combination becomes a row with its OWN price
 * and stock. Saving replaces the whole config atomically; existing order
 * lines keep their snapshots, so this is always safe.
 */
export default function VariantBuilder({ product }: { product: ProductDetail }) {
  const router = useRouter();

  const initialGroups: GroupDraft[] = product.groups.map((group) => ({
    name: group.name,
    options: group.options.map((option) => option.value),
  }));
  const optionValueById = new Map(product.groups.flatMap((group) => group.options.map((option) => [option.id, option.value])));
  const initialRows: RowDraft[] = product.variants.map((variant) => ({
    // Recover the combination in group order from the variant's option ids.
    options: product.groups.map((group) => {
      const optionId = variant.optionIds.find((id) => group.options.some((option) => option.id === id));
      return (optionId && optionValueById.get(optionId)) ?? "";
    }),
    price: String(variant.price),
    stock: String(variant.stock),
    isActive: variant.isActive,
  }));

  const [groups, setGroups] = useState<GroupDraft[]>(initialGroups);
  const [rows, setRows] = useState<RowDraft[]>(initialRows);
  const [newGroupName, setNewGroupName] = useState("");
  const [optionInputs, setOptionInputs] = useState<string[]>(initialGroups.map(() => ""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const applyGroups = (nextGroups: GroupDraft[]) => {
    setGroups(nextGroups);
    setRows((previous) => syncRows(nextGroups, previous, product.price));
    setSaved(false);
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      setError(`Group "${name}" already exists.`);
      return;
    }
    setError(null);
    applyGroups([...groups, { name, options: [] }]);
    setOptionInputs((inputs) => [...inputs, ""]);
    setNewGroupName("");
  };

  const removeGroup = (index: number) => {
    applyGroups(groups.filter((_, groupIndex) => groupIndex !== index));
    setOptionInputs((inputs) => inputs.filter((_, inputIndex) => inputIndex !== index));
  };

  const addOption = (groupIndex: number) => {
    const value = optionInputs[groupIndex]?.trim();
    if (!value) return;
    const group = groups[groupIndex];
    if (group.options.some((option) => option.toLowerCase() === value.toLowerCase())) {
      setError(`"${value}" is already in ${group.name}.`);
      return;
    }
    if (group.options.length >= MAX_OPTIONS_PER_GROUP) {
      setError(`${group.name} already has ${MAX_OPTIONS_PER_GROUP} options.`);
      return;
    }
    setError(null);
    applyGroups(groups.map((current, index) => (index === groupIndex ? { ...current, options: [...current.options, value] } : current)));
    setOptionInputs((inputs) => inputs.map((input, index) => (index === groupIndex ? "" : input)));
  };

  const removeOption = (groupIndex: number, value: string) => {
    applyGroups(
      groups.map((current, index) =>
        index === groupIndex ? { ...current, options: current.options.filter((option) => option !== value) } : current,
      ),
    );
  };

  const updateRow = (rowIndex: number, patch: Partial<RowDraft>) => {
    setRows((current) => current.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)));
    setSaved(false);
  };

  const save = async (config: { groups: GroupDraft[]; rows: RowDraft[] }) => {
    setError(null);
    setSaved(false);
    for (const row of config.rows) {
      const price = Number(row.price);
      const stock = Number(row.stock);
      if (!Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
        setError(`"${comboKey(row.options)}" needs a valid price and stock.`);
        return;
      }
    }
    setSubmitting(true);
    const result = await replaceProductVariantsAction(product.id, {
      groups: config.groups,
      variants: config.rows.map((row) => ({
        options: row.options,
        price: Math.floor(Number(row.price)),
        stock: Math.floor(Number(row.stock)),
        isActive: row.isActive,
      })),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  const handleSave = () => {
    if (groups.length > 0 && rows.length === 0) {
      setError("Every option group needs at least one option before saving.");
      return;
    }
    void save({ groups, rows });
  };

  const handleRemoveAll = () => {
    if (!window.confirm("Remove all options and variants? The product falls back to its base price and stock.")) return;
    setGroups([]);
    setRows([]);
    setOptionInputs([]);
    void save({ groups: [], rows: [] });
  };

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="tag">Options &amp; variants</span>
        {product.variants.length > 0 && (
          <button type="button" onClick={handleRemoveAll} className="text-xs font-black uppercase text-red-600 hover:underline">
            Remove all variants
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-black/45">
        Add option groups like Color or Size — every combination gets its own price and stock, Tokopedia/Shopee style.
        Without variants, the base price ({formatPrice(product.price)}) and base stock apply.
      </p>

      {/* Groups */}
      <div className="mt-5 space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={group.name} className="border-2 border-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm font-black uppercase">{group.name}</strong>
              <button type="button" onClick={() => removeGroup(groupIndex)} className="text-[10px] font-black uppercase text-red-600 hover:underline">
                Remove group
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.options.map((option) => (
                <span key={option} className="filter-chip filter-chip-active inline-flex items-center gap-2">
                  {option}
                  <button type="button" onClick={() => removeOption(groupIndex, option)} aria-label={`Remove ${option} from ${group.name}`} className="font-black hover:text-red-600">
                    ×
                  </button>
                </span>
              ))}
              {group.options.length === 0 && <span className="text-xs text-black/40">No options yet.</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={optionInputs[groupIndex] ?? ""}
                onChange={(event) => setOptionInputs((inputs) => inputs.map((input, index) => (index === groupIndex ? event.target.value : input)))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addOption(groupIndex);
                  }
                }}
                placeholder={groupIndex === 0 ? "E.g. Red" : "E.g. XL"}
                className="text-field mt-0 h-11 flex-1"
                aria-label={`New ${group.name} option`}
              />
              <button type="button" onClick={() => addOption(groupIndex)} className="button button-outline-ink">
                Add option
              </button>
            </div>
          </div>
        ))}

        {groups.length < MAX_GROUPS && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addGroup();
                }
              }}
              placeholder='New option group, e.g. "Color" or "Size"'
              className="text-field mt-0 h-11 flex-1"
              aria-label="New option group name"
            />
            <button type="button" onClick={addGroup} className="button button-dark">
              Add group
            </button>
          </div>
        )}
      </div>

      {/* Matrix */}
      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto border-2 border-ink">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b-2 border-ink bg-paper text-left text-[10px] font-black uppercase tracking-widest text-black/50">
              <tr>
                <th className="p-3">Variant</th>
                <th className="p-3">Price (Rp)</th>
                <th className="p-3">Stock</th>
                <th className="p-3 text-right">Selling</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={comboKey(row.options)} className="border-b border-black/10 last:border-b-0">
                  <td className="p-3 font-black uppercase">{comboKey(row.options)}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.price}
                      onChange={(event) => updateRow(rowIndex, { price: event.target.value })}
                      aria-label={`Price for ${comboKey(row.options)}`}
                      className="text-field mt-0 h-11 w-32"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.stock}
                      onChange={(event) => updateRow(rowIndex, { stock: event.target.value })}
                      aria-label={`Stock for ${comboKey(row.options)}`}
                      className="text-field mt-0 h-11 w-24"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) => updateRow(rowIndex, { isActive: event.target.checked })}
                      aria-label={`${comboKey(row.options)} is selling`}
                      className="h-5 w-5 border-black text-black focus:ring-lime"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm font-bold text-[#5c8500]">Variants saved ✓</p>}
      <button type="button" onClick={handleSave} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
        {submitting ? "Saving…" : "Save variants"}
      </button>
    </div>
  );
}
