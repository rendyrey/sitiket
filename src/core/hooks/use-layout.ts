'use client';

import { atom, useAtom } from 'jotai';
import { LAYOUT_OPTIONS } from '../config/enums';

const layoutAtom = atom<LAYOUT_OPTIONS>(LAYOUT_OPTIONS.HYDROGEN);

/** Shared layout selection used by components with layout-specific styling. */
export function useLayout() {
  const [layout, setLayout] = useAtom(layoutAtom);
  return { layout, setLayout };
}
