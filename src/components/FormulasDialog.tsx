import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { getFormulas, saveFormulas, getKwhPrice, setKwhPrice } from "@/lib/crm.functions";
import { DEFAULT_FORMULAS, applyFormulas, type Formulas } from "@/lib/formulas";
import { BOT_PRESETS } from "@/lib/bot-presets";

const RES = BOT_PRESETS.filter((p) => p.type !== "com");

function Num({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  const [t, setT] = useState(String(value));
  useEffect(() => setT(String(value)), [value]);
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
      <span className="min-w-0">{label}{hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}</span>
      <input value={t} inputMode="decimal" onChange={(e) => { const s = e.target.value.replace(/[^\d.]/g, ""); setT(s); const n = Number(s); if (n > 0) onChange(n); }}
        className="w-20 shrink-0 rounded-md border border-border bg-card px-2 py-1 text-center font-bold" />
    </label>
  );
}

function Eq({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border p-2">
      <div className="text-xs font-bold"><span className="ml-1 rounded bg-primary px-1.5 text-primary-foreground">{n}</span>{title}</div>
      {children}
    </div>
  );
}

export function FormulasDialog({ pw, code, onClose }: { pw: string; code: string; onClose: () => void }) {
  const qc = useQueryClient();
  const get = useServerFn(getFormulas), save = useServerFn(saveFormulas), getK = useServerFn(getKwhPrice), saveK = useServerFn(setKwhPrice);
  const [f, setF] = useState<Formulas | null>(null);
  const [kwh, setKwh] = useState(290);
  const [tab, setTab] = useState<"base" | "res" | "com">("base");
  const [resSub, setResSub] = useState<"small" | "big" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { get({ data: { pw } }).then((r) => setF(r.formulas)).catch((e) => setMsg({ ok: false, t: e.message })); getK({ data: { pw } }).then((r) => setKwh(r.kwh_price)).catch(() => {}); }, []);
  const up = (p: Partial<Formulas>) => setF((o) => (o ? { ...o, ...p } : o));
  const setRange = (i: number, j: number, v: number) => setF((o) => { if (!o) return o; const r = o.resRanges.map((x) => [...x]); r[i]![j] = v; return { ...o, resRanges: r }; });

  const doSave = async () => {
    if (!f) return;
    setBusy(true); setMsg(null);
    try {
      const r = await save({ data: { pw, code, formulas: f as unknown as Record<string, unknown> } });
      await saveK({ data: { pw, price: kwh } });
      applyFormulas(r.formulas);
      await qc.invalidateQueries({ queryKey: ["formulas"] }); await qc.invalidateQueries({ queryKey: ["kwh_price"] });
      setMsg({ ok: true, t: "تم الحفظ — يطبَّق في التطبيق والبوت فوراً" });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); }
    setBusy(false);
  };

  const seven = (fx: Formulas, idx: number[]) => (
    <div className="space-y-2">
      <Eq n={1} title="معادلة الألواح — عدد الألواح = قدرة الألواح ÷ قدرة اللوح">
        <Num label="ساعات الإشعاع اليومي" value={fx.sun} onChange={(v) => up({ sun: v })} />
      </Eq>
      <Eq n={2} title="معادلة الإنفرتر — نطاق الاستهلاك اليومي لكل منظومة (كيلووات/يوم)">
        {idx.length ? idx.map((i) => RES[i] && fx.resRanges[i]!.map((v, j) => <Num key={i + "-" + j} label={RES[i]!.group + " · " + RES[i]!.title} value={v} onChange={(n) => setRange(i, j, n)} />))
          : <p className="text-[11px] text-muted-foreground">يعرض الإنفرترات 8 / 12 / 16 / 20 التي يغطي أقصى إنتاج منظوماتها الاستهلاك اليومي.</p>}
      </Eq>
      <Eq n={3} title="معادلة البطارية — الاستهلاك الليلي = اليومي × النسبة">
        <Num label="نسبة الليل عند اختيار 30% ليل" value={fx.night[30]} onChange={(v) => up({ night: { ...fx.night, 30: v } })} />
        <Num label="نسبة الليل عند اختيار 50/50" value={fx.night[50]} onChange={(v) => up({ night: { ...fx.night, 50: v } })} />
        <Num label="نسبة الليل عند اختيار 70% ليل" value={fx.night[70]} onChange={(v) => up({ night: { ...fx.night, 70: v } })} />
      </Eq>
      <Eq n={4} title="صناديق حماية DC — الكمية = ⌈المجموعات ÷ أقصى خطوط⌉">
        <Num label="أقصى عدد خطوط للصندوق" value={fx.dcMaxLines} onChange={(v) => up({ dcMaxLines: v })} />
        <Num label="خطوة التقريب (خطوط)" value={fx.dcStep} onChange={(v) => up({ dcStep: v })} />
      </Eq>
      <Eq n={5} title="لوحة حماية AC — القاطع = القدرة ÷ الجهد × معامل الأمان (إنفرترين فأكثر = لوحة تجميع)">
        <Num label="جهد سنجل فاز (فولت)" value={fx.acSingleV} onChange={(v) => up({ acSingleV: v })} />
        <Num label="مقسوم ثري فاز (√3×380)" value={fx.acThreeDiv} onChange={(v) => up({ acThreeDiv: v })} />
        <Num label="معامل الأمان" value={fx.acSafety} onChange={(v) => up({ acSafety: v })} />
      </Eq>
      <Eq n={6} title="معادلة الكابل">
        <Num label="متر لكل منظومة" value={fx.cableM} onChange={(v) => up({ cableM: v })} />
      </Eq>
      <Eq n={7} title="صنف الكنشات (MC4)">
        <Num label="جهد اللوح Voc (فولت)" value={fx.panelVoc} onChange={(v) => up({ panelVoc: v })} />
        <Num label="معامل الأمان الحراري" value={fx.coldFactor} onChange={(v) => up({ coldFactor: v })} />
        <Num label="أقصى جهد إنفرتر سنجل فاز (فولت)" value={fx.vmaxSingle} onChange={(v) => up({ vmaxSingle: v })} />
        <Num label="أقصى جهد إنفرتر ثري فاز (فولت)" value={fx.vmaxThree} onChange={(v) => up({ vmaxThree: v })} />
        <p className="text-xs text-muted-foreground">أقصى ألواح بالاسترنق: سنجل {Math.max(1, Math.floor(fx.vmaxSingle / (fx.panelVoc * fx.coldFactor)))} · ثري {Math.max(1, Math.floor(fx.vmaxThree / (fx.panelVoc * fx.coldFactor)))}</p>
        <Num label="عدد الأطقم لكل استرنق" value={fx.mc4PerString} onChange={(v) => up({ mc4PerString: v })} />
      </Eq>
    </div>
  );

  const small = RES.map((p, i) => (/^إنفرتر (1\.6|6\.2) /.test(p.group) ? i : -1)).filter((i) => i >= 0);
  const big = RES.map((p, i) => (/^إنفرتر (8|12) /.test(p.group) ? i : -1)).filter((i) => i >= 0);

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-2" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-bold">المعادلات</h2><button onClick={onClose} aria-label="إغلاق"><X className="h-4 w-4" /></button></div>
        <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold">
          {([["base", "كل المعادلات"], ["res", "معادلات النظام السكني"], ["com", "معادلات النظام التجاري"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-1 py-1.5 ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {!f ? <p className="text-xs text-muted-foreground">جاري التحميل…</p> : tab === "base" ? (
            <div className="space-y-2">
              <Eq n={1} title="معادلة الاستهلاك اليومي">
                <p className="text-[11px] text-muted-foreground">الاستهلاك الشهري = الفاتورة ÷ سعر الكيلووات<br />الاستهلاك اليومي = الشهري ÷ أيام الشهر</p>
                <Num label="سعر الكيلووات (ريال يمني)" value={kwh} onChange={setKwh} />
                <Num label="أيام الشهر" value={f.days} onChange={(v) => up({ days: v })} />
              </Eq>
              <Eq n={2} title="معادلة اختيار الألواح">
                <p className="text-[11px] text-muted-foreground">قدرة الألواح (kWp) = الاستهلاك اليومي ÷ ساعات الإشعاع<br />العدد = قدرة الألواح × 1000 ÷ قدرة اللوح<br />أقصى ألواح بالاسترنق = ⌊أقصى جهد الإنفرتر ÷ (Voc × معامل الحرارة)⌋<br />الاسترنقات = ⌈العدد ÷ أقصى ألواح بالاسترنق⌉<br />يُقرَّب العدد للأعلى ليتوزع بالتساوي على الاسترنقات<br />الكنشات = الاسترنقات × الأطقم لكل استرنق</p>
                <Num label="ساعات الإشعاع اليومي" value={f.sun} onChange={(v) => up({ sun: v })} />
                <Num label="قدرة اللوح (واط)" value={f.panelW} onChange={(v) => up({ panelW: v })} />
                <Num label="جهد اللوح Voc (فولت)" value={f.panelVoc} onChange={(v) => up({ panelVoc: v })} />
                <Num label="معامل الأمان الحراري" value={f.coldFactor} onChange={(v) => up({ coldFactor: v })} />
                <Num label="أقصى جهد إنفرتر سنجل فاز (فولت)" value={f.vmaxSingle} onChange={(v) => up({ vmaxSingle: v })} />
                <Num label="أقصى جهد إنفرتر ثري فاز (فولت)" value={f.vmaxThree} onChange={(v) => up({ vmaxThree: v })} />
                <Num label="أقصى جهد إنفرتر هاي فولتج (فولت)" value={f.vmaxHV} onChange={(v) => up({ vmaxHV: v })} />
                <p className="text-xs text-muted-foreground">أقصى ألواح بالاسترنق: سنجل {Math.max(1, Math.floor(f.vmaxSingle / (f.panelVoc * f.coldFactor)))} · ثري {Math.max(1, Math.floor(f.vmaxThree / (f.panelVoc * f.coldFactor)))} · هاي فولتج {Math.max(1, Math.floor(f.vmaxHV / (f.panelVoc * f.coldFactor)))}</p>
                <Num label="أطقم الكنشات MC4 لكل استرنق" value={f.mc4PerString} onChange={(v) => up({ mc4PerString: v })} />
              </Eq>
              <Eq n={3} title="معادلة اختيار الإنفرتر">
                <p className="text-[11px] text-muted-foreground">القدرة المطلوبة = أكبر(الحمل في الساعة، قدرة الألواح ÷ نسبة الألواح إلى الإنفرتر)<br />عدد الإنفرترات = ⌈القدرة المطلوبة ÷ قدرة الإنفرتر⌉ (حتى الحد الأقصى)<br />يُختار الأرخص<br />فوق حد الجهد المنخفض تُعرض إنفرترات هاي فولتج فقط<br />إنفرتران فأكثر = لوحة تجميع</p>
                <Num label="نسبة الألواح إلى الإنفرتر" value={f.dcRatio} onChange={(v) => up({ dcRatio: v })} />
                <Num label="أقصى قدرة للجهد المنخفض (كيلو)" value={f.lvMaxKw} onChange={(v) => up({ lvMaxKw: v })} />
                <Num label="أقصى عدد إنفرترات بالتوازي" value={f.maxInverters} onChange={(v) => up({ maxInverters: Math.round(v) })} />
              </Eq>
              <Eq n={4} title="معادلة اختيار البطاريات">
                <p className="text-[11px] text-muted-foreground">استهلاك الليل = الاستهلاك اليومي × نسبة الليل<br />السعة المطلوبة = استهلاك الليل ÷ معامل التفريغ<br />البطاريات = ⌈السعة ÷ سعة البطارية⌉ (إذا كان النقص أقل من السماحية لا تُضاف بطارية)<br />هاي فولتج: أقل عدد ثم أي عدد<br />BCU = ⌈البطاريات ÷ لكل كنترول⌉<br />EBC عند ضعف أقل عدد<br />قاطع حماية لكل BCU</p>
                <Num label="نسبة الليل عند اختيار 30% ليل" value={f.night[30]} onChange={(v) => up({ night: { ...f.night, 30: v } })} />
                <Num label="نسبة الليل عند اختيار 50/50" value={f.night[50]} onChange={(v) => up({ night: { ...f.night, 50: v } })} />
                <Num label="نسبة الليل عند اختيار 70% ليل" value={f.night[70]} onChange={(v) => up({ night: { ...f.night, 70: v } })} />
                <Num label="معامل تفريغ البطارية" value={f.dod} onChange={(v) => up({ dod: Math.min(v, 1) })} />
                <Num label="سعة البطارية (كيلووات ساعة)" value={f.batKwh} onChange={(v) => up({ batKwh: v })} />
                <Num label="سماحية نقص الليل (كيلووات ساعة)" value={f.batTol} onChange={(v) => up({ batTol: v })} />
                <Num label="أقل عدد بطاريات هاي فولتج" value={f.hvMinBat} onChange={(v) => up({ hvMinBat: Math.round(v) })} />
                <Num label="أقصى بطاريات لكل كنترول BCU" value={f.hvBatPerBcu} onChange={(v) => up({ hvBatPerBcu: Math.round(v) })} />
              </Eq>
              <Eq n={5} title="معادلات الحماية والتوصيل">
                <p className="text-[11px] text-muted-foreground">صناديق DC = ⌈الاسترنقات ÷ أقصى خطوط⌉<br />خطوط الصندوق تُقرَّب لخطوة التقريب<br />قاطع AC = القدرة ÷ الجهد × معامل الأمان (ثري فاز: ÷ √3×380)<br />الكابل = متر لكل منظومة</p>
                <Num label="أقصى عدد خطوط للصندوق" value={f.dcMaxLines} onChange={(v) => up({ dcMaxLines: v })} />
                <Num label="خطوة التقريب (خطوط)" value={f.dcStep} onChange={(v) => up({ dcStep: v })} />
                <Num label="جهد سنجل فاز (فولت)" value={f.acSingleV} onChange={(v) => up({ acSingleV: v })} />
                <Num label="مقسوم ثري فاز (√3×380)" value={f.acThreeDiv} onChange={(v) => up({ acThreeDiv: v })} />
                <Num label="معامل الأمان" value={f.acSafety} onChange={(v) => up({ acSafety: v })} />
                <Num label="متر كابل لكل منظومة" value={f.cableM} onChange={(v) => up({ cableM: v })} />
              </Eq>
            </div>
          ) : tab === "res" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold">
                <button onClick={() => setResSub("small")} className={`rounded-lg px-1 py-1.5 ${resSub === "small" ? "bg-ink text-ink-foreground" : "bg-muted"}`}>انفرتر 1.6 و 6.2</button>
                <button onClick={() => setResSub("big")} className={`rounded-lg px-1 py-1.5 ${resSub === "big" ? "bg-ink text-ink-foreground" : "bg-muted"}`}>انفرتر 8 و 12 Single Phase</button>
              </div>
              {resSub === "small" && <Eq n={0} title="جدول النطاقات (كيلووات/يوم)">{small.map((i) => f.resRanges[i]!.map((v, j) => <Num key={i + "-" + j} label={RES[i]!.group + " · " + RES[i]!.title} value={v} onChange={(n) => setRange(i, j, n)} />))}</Eq>}
              {resSub === "big" && seven(f, big)}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-bold">منظومات Low Voltage</div>{seven(f, [])}
              <div className="pt-2 text-xs font-bold">منظومات High Voltage (50 / 80 / 125 كيلو)</div>
              <p className="text-[11px] text-muted-foreground">نفس معادلات الألواح والصناديق ولوحة AC والكابل والكنشات أعلاه؛ الأصناف (1500V، كابل 10 مم، لوحات 50/80/125) تُختار من جدول الأصناف.</p>
              <Eq n={3} title="البطارية وملحقاتها (كنترول BCU + كنترول ربط EBC + قاطع حماية البطاريات)">
                <Num label="أقل عدد بطاريات هاي فولتج" value={f.hvMinBat} onChange={(v) => up({ hvMinBat: Math.round(v) })} />
                <Num label="أقصى بطاريات لكل كنترول BCU" value={f.hvBatPerBcu} onChange={(v) => up({ hvBatPerBcu: Math.round(v) })} />
                <p className="text-xs text-muted-foreground">BCU = ⌈البطاريات ÷ {f.hvBatPerBcu}⌉ · EBC عند {2 * f.hvMinBat} بطاريات فأكثر · قاطع حماية لكل BCU</p>
              </Eq>
              <Eq n={4} title="تقسيم الاسترنقات (Voc)">
                <Num label="أقصى جهد إنفرتر هاي فولتج (فولت)" value={f.vmaxHV} onChange={(v) => up({ vmaxHV: v })} />
                <p className="text-xs text-muted-foreground">أقصى ألواح بالاسترنق: {Math.max(1, Math.floor(f.vmaxHV / (f.panelVoc * f.coldFactor)))}</p>
              </Eq>
            </div>
          )}
        </div>
        {msg && <p className={`text-xs ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.t}</p>}
        <div className="flex gap-2">
          <button disabled={busy || !f} onClick={doSave} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">حفظ</button>
          <button disabled={busy} onClick={() => { setF(structuredClone(DEFAULT_FORMULAS)); setMsg({ ok: true, t: "تمت استعادة القيم الافتراضية — اضغط حفظ لاعتمادها" }); }} className="rounded-lg border border-border px-3 py-2 text-xs">الافتراضي</button>
        </div>
      </div>
    </div>
  );
}
