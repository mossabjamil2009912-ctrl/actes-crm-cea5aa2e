import { describe, it, expect } from "vitest";
import { storageParts } from "@/lib/storage";
import { DEFAULT_FORMULAS as D } from "@/lib/formulas";

describe("HV storage choice (matches the old bot storOptions)", () => {
  it("Hithium 112S keeps the computed batteries", () => expect(storageParts("h112s", 192, D)).toBeNull());
  it("192 kWh → 13 Pylontech M5 in a 16-rack", () => expect(storageParts("pylon", 192, D)).toEqual([["BAT_PYLON_M5_15_68K", 13], ["RACK_M5_16", 1], ["CTRL_M5", 1], ["KIT_M5", 1]]));
  it("288 kWh → 19 M5 in a 20-rack", () => expect(storageParts("pylon", 288, D)?.slice(0, 2)).toEqual([["BAT_PYLON_M5_15_68K", 19], ["RACK_M5_20", 1]]));
  it("64 kWh → 14 Pylontech M1 in a 23-rack", () => expect(storageParts("pylon", 64, D)?.slice(0, 2)).toEqual([["BAT_PYLON_M1_4_74K", 14], ["RACK_M1C_23", 1]]));
  it("192 kWh → 2 Hithium 112C cabinets", () => expect(storageParts("cab112", 192, D)).toEqual([["CAB_HITHIUM_112", 2]]));
  it("112 kWh → 1 Hithium 112C cabinet", () => expect(storageParts("cab112", 112, D)).toEqual([["CAB_HITHIUM_112", 1]]));
});
