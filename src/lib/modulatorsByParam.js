/**
 * modulatorsByParam.js — derived store grouping modulators by target.
 */

import { derived } from "svelte/store";
import { modulators } from "./stores.js";

export const modulatorsByTarget = derived(modulators, ($mods) => {
  const map = new Map();
  for (const m of $mods) {
    if (!m.target || !m.target.param || m.target.param === "---") continue;
    const key = (m.target.resource || "parameters") + ":" + m.target.param;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  return map;
});

export const unassignedMods = derived(modulators, ($mods) => {
  return $mods.filter((m) => !m.target || !m.target.param || m.target.param === "---");
});
