"use client";

import { useEffect, useState } from "react";
import SearchableSelect from "@/components/ui/searchable-select";
import type { RegionDistrict, RegionProvince, RegionRegency, RegionVillage } from "@/lib/api/types";
import {
  listDistrictsAction,
  listProvincesAction,
  listRegenciesAction,
  listVillagesAction,
} from "../lib/actions";

/** What the picker reports once a village (the quotable unit) is chosen. */
export interface AddressPickerSelection {
  /** 10-digit api.co.id village code — what shipping quotes key on. */
  villageCode: string;
  /** The chosen village's own postal codes (often exactly one). */
  postalCodes: string[];
  /** False when no courier serves this village yet. */
  isCourierSupport: boolean;
}

type AddressPickerProps = {
  /** Saved codes to prefill the cascade with (e.g. from the user's profile). */
  initial?: {
    provinceCode?: string | null;
    cityCode?: string | null;
    districtCode?: string | null;
    villageCode?: string | null;
  };
  /** Fired with the selection when a village is chosen, and `null` whenever the selection becomes incomplete. */
  onChange: (selection: AddressPickerSelection | null) => void;
  disabled?: boolean;
};

/**
 * One loaded child-region list, tagged with the parent code it belongs to —
 * a list whose `key` no longer matches the selected parent is stale, which
 * doubles as the "loading" signal without any synchronous effect state.
 */
interface KeyedList<T> {
  /** The parent region code the rows were fetched for. Example: `"3172"`. */
  key: string;
  rows: T[];
}

export default function AddressPicker({ initial, onChange, disabled }: AddressPickerProps) {
  const [provinces, setProvinces] = useState<RegionProvince[] | null>(null);
  const [regencyList, setRegencyList] = useState<KeyedList<RegionRegency> | null>(null);
  const [districtList, setDistrictList] = useState<KeyedList<RegionDistrict> | null>(null);
  const [villageList, setVillageList] = useState<KeyedList<RegionVillage> | null>(null);

  const [provinceCode, setProvinceCode] = useState(initial?.provinceCode ?? "");
  const [cityCode, setCityCode] = useState(initial?.cityCode ?? "");
  const [districtCode, setDistrictCode] = useState(initial?.districtCode ?? "");
  const [villageCode, setVillageCode] = useState(initial?.villageCode ?? "");

  const [error, setError] = useState<string | null>(null);

  // Load provinces once; each deeper level loads whenever its parent code is
  // set (including the initial prefill from a saved address). All setState
  // happens in the async callbacks — the effect bodies stay side-effect-only.
  useEffect(() => {
    let cancelled = false;
    void listProvincesAction().then((result) => {
      if (cancelled) return;
      if (result.ok) setProvinces(result.data);
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!provinceCode) return;
    let cancelled = false;
    void listRegenciesAction(provinceCode).then((result) => {
      if (cancelled) return;
      if (result.ok) setRegencyList({ key: provinceCode, rows: result.data });
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  useEffect(() => {
    if (!cityCode) return;
    let cancelled = false;
    void listDistrictsAction(cityCode).then((result) => {
      if (cancelled) return;
      if (result.ok) setDistrictList({ key: cityCode, rows: result.data });
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [cityCode]);

  useEffect(() => {
    if (!districtCode) return;
    let cancelled = false;
    void listVillagesAction(districtCode).then((result) => {
      if (cancelled) return;
      if (result.ok) setVillageList({ key: districtCode, rows: result.data });
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [districtCode]);

  // A list is only usable when it was fetched for the CURRENTLY selected
  // parent — otherwise it is stale (parent just changed) and we show "Loading…".
  const regencies = regencyList?.key === provinceCode ? regencyList.rows : [];
  const districts = districtList?.key === cityCode ? districtList.rows : [];
  const villages = villageList?.key === districtCode ? villageList.rows : [];
  const regenciesLoading = Boolean(provinceCode) && regencyList?.key !== provinceCode;
  const districtsLoading = Boolean(cityCode) && districtList?.key !== cityCode;
  const villagesLoading = Boolean(districtCode) && villageList?.key !== districtCode;

  /** Emits the completed selection (or null) whenever the village choice changes. */
  const emitVillage = (code: string, list: RegionVillage[]) => {
    const village = list.find((row) => row.code === code);
    onChange(
      village
        ? {
            villageCode: village.code,
            postalCodes: village.postal_codes ?? [],
            isCourierSupport: village.is_courier_support !== false,
          }
        : null,
    );
  };

  return (
    // Container-query columns: the picker renders both in wide pages and the
    // narrow account sidebar — its own width, not the viewport, decides.
    <div className="grid gap-4 @md:grid-cols-2">
      <label className="field-label">
        Province
        <SearchableSelect
          value={provinceCode}
          disabled={disabled || !provinces}
          placeholder={provinces ? "Select province" : "Loading…"}
          options={(provinces ?? []).map((province) => ({ value: province.code, label: province.name }))}
          onChange={(code) => {
            setError(null);
            setProvinceCode(code);
            setCityCode("");
            setDistrictCode("");
            setVillageCode("");
            onChange(null);
          }}
        />
      </label>

      <label className="field-label">
        City / regency
        <SearchableSelect
          value={cityCode}
          disabled={disabled || !provinceCode}
          placeholder={regenciesLoading ? "Loading…" : "Select city"}
          options={regencies.map((regency) => ({ value: regency.code, label: regency.name }))}
          onChange={(code) => {
            setError(null);
            setCityCode(code);
            setDistrictCode("");
            setVillageCode("");
            onChange(null);
          }}
        />
      </label>

      <label className="field-label">
        District (kecamatan)
        <SearchableSelect
          value={districtCode}
          disabled={disabled || !cityCode}
          placeholder={districtsLoading ? "Loading…" : "Select district"}
          options={districts.map((district) => ({ value: district.code, label: district.name }))}
          onChange={(code) => {
            setError(null);
            setDistrictCode(code);
            setVillageCode("");
            onChange(null);
          }}
        />
      </label>

      <label className="field-label">
        Village (kelurahan/desa)
        <SearchableSelect
          value={villageCode}
          disabled={disabled || !districtCode}
          placeholder={villagesLoading ? "Loading…" : "Select village"}
          options={villages.map((village) => ({
            value: village.code,
            label: `${village.name}${village.is_courier_support === false ? " (no courier support yet)" : ""}`,
          }))}
          onChange={(code) => {
            setError(null);
            setVillageCode(code);
            emitVillage(code, villages);
          }}
        />
      </label>

      {error && <p className="text-sm font-semibold text-red-600 @md:col-span-2">{error}</p>}
    </div>
  );
}
