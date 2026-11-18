// Storage choice for High Voltage systems (50/80/125 kW): Hithium 112S racks (default), Pylontech M1/M5 racks,
// or cabinets (Hithium 112C, Pylontech 261/313). Capacity = HV batteries × battery kWh (same as the old bot `rw.bat`).
// Ported 1:1 to the n8n State Machine as ACTES_STORAGE — change both together.
import { F, type Formulas, type EqItem, type EqLine } from "@/lib/formulas";

export type StorageChoice = "h112s" | "pylon" | "cab112" | "cab261" | "cab313";
export const STORAGE_LABELS: Record<StorageChoice, string> = {
  h112s: "راكات Hithium 112S", pylon: "راكات Pylontech", cab112: "كبينة Hithium 112C", cab261: "كبينة Pylontech 261", cab313: "كبينة Pylontech 313",
};
const up = (x: number) => Math.ceil(x - 1e-9);

// Items replacing the Hithium HV batteries + controls; null = keep the Hithium 112S racks.
export function storageParts(choice: StorageChoice, cap: number, f: Formulas = F): [string, number][] | null {
  if (choice === "h112s" || !(cap > 0)) return null;
  if (choice === "cab112") return [["CAB_HITHIUM_112", up(cap / f.cabKwh)]];
  if (choice === "cab261") return [["CAB_PYLON_261", up(cap / 261)]];
  if (choice === "cab313") return [["CAB_PYLON_313", up(cap / 313)]];
  if (cap <= f.m1MaxKwh) {
    const n = Math.max(6, up(cap / f.m1Kwh));
    return [["BAT_PYLON_M1_4_74K", n], [n <= 13 ? "RACK_M1C_13" : "RACK_M1C_23", 1], ["CTRL_M1C", 1], ["KIT_M1C", 1]];
  }
  const n = Math.max(7, up(cap / f.m5Kwh)), racks = Math.ceil(n / 20), per = Math.ceil(n / racks);
  return [["BAT_PYLON_M5_15_68K", n], [per <= 11 ? "RACK_M5_11" : per <= 16 ? "RACK_M5_16" : "RACK_M5_20", racks], ["CTRL_M5", racks], ["KIT_M5", racks]];
}

const isHvBat = (r: EqItem | undefined, l: EqLine) => r?.category === "batteries" && /HV|هاي فولتج/i.test(`${l.key} ${r.name}`);
export const hvCapacity = (lines: EqLine[], items: EqItem[], f: Formulas = F) =>
  lines.reduce((s, l) => s + (isHvBat(items.find((i) => i.key === l.key), l) ? l.qty : 0), 0) * f.batKwh;

export function applyStorage<L extends EqLine>(lines: L[], choice: StorageChoice, items: EqItem[], f: Formulas = F): L[] {
  const parts = storageParts(choice, hvCapacity(lines, items, f), f);
  if (!parts || !lines.length) return lines;
  const found = parts.map(([k, q]) => [items.find((i) => i.key === k), q] as const);
  if (found.some(([r]) => !r)) return lines;
  const keep = lines.filter((l) => { const r = items.find((i) => i.key === l.key); return !isHvBat(r, l) && r?.category !== "battery_controls"; });
  const add = found.map(([r, qty]) => ({ ...lines[0]!, key: r!.key, name: r!.name, unit: r!.unit, price: Number(r!.price ?? 0), qty, specs: Array.isArray(r!.specs) ? (r!.specs as unknown[]).map(String) : [], auto: false }));
  return [...keep, ...add];
}
