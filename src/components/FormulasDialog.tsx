import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { getFormulas, saveFormulas, getKwhPrice, setKwhPrice } from "@/lib/crm.functions";
import { DEFAULT_FORMULAS, applyFormulas, type Formulas } from "@/lib/formulas";
import { BOT_PRESETS } from "@/lib/bot-presets";

const RES = BOT_PRESETS.filter((p) => p.type !== "com");

// Keeps bracketed English/number parts like "(1500V)" in one piece inside Arabic text.
const bidi = (t: string) => t.split(/(\([^()]*[A-Za-z√][^()]*\))/).map((x, i) => (i % 2 ? <bdi key={i} dir="ltr">{x}</bdi> : x));

function Num({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  const [t, setT] = useState(String(value));
  useEffect(() => setT(String(value)), [value]);
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
      <span className="min-w-0">{bidi(label)}{hint && <span className="block text-[10px] text-muted-foreground">{bidi(hint)}</span>}</span>
      <input value={t} inputMode="decimal" onChange={(e) => { const s = e.target.value.replace(/[^\d.]/g, ""); setT(s); const n = Number(s); if (n > 0) onChange(n); }}
        className="w-20 shrink-0 rounded-md border border-border bg-card px-2 py-1 text-center font-bold" />
    </label>
  );
}

function Eq({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border p-2">
      <div className="text-xs font-bold"><span className="ml-1 rounded bg-primary px-1.5 text-primary-foreground">{n}</span>{bidi(title)}</div>
      {children}
    </div>
  );
}

export function FormulasDialog({ pw, code, onClose }: { pw: string; code: string; onClose: () => void }) {
  const qc = useQueryClient();
  const get = useServerFn(getFormulas), save = useServerFn(saveFormulas), getK = useServerFn(getKwhPrice), saveK = useServerFn(setKwhPrice);
  const [f, setF] = useState<Formulas | null>(null);
  const [kwh, setKwh] = useState(290);
  const [tab, setTab] = useState<"res" | "com">("com");
  const [resSub, setResSub] = useState<"small" | "big">("small");
  const [comSub, setComSub] = useState<"lv" | "hv">("lv");
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

  // Math rendering: brackets are drawn with borders and fractions are stacked,
  // so right-to-left text can never flip or misplace them.
  type K = { children?: React.ReactNode };
  const L = ({ children }: K) => <div className="eq-box space-y-1.5 rounded-lg border border-primary/30 bg-muted/60 px-2.5 py-2 text-[13px] leading-6">{children}</div>;
  const Ln = ({ l, children }: K & { l: React.ReactNode }) => (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className="font-semibold text-foreground">{l}</span><span className="font-bold text-primary">=</span>
      <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">{children}</span>
    </div>
  );
  const Nt = ({ children }: K) => <div className="text-[11px] leading-5 text-muted-foreground">{children}</div>;
  const O = ({ c }: { c: string }) => <span className="px-0.5 font-bold text-primary">{c}</span>;
  const V = ({ children }: K) => <bdi dir="ltr" className="eq-v">{children}</bdi>;
  const R = ({ children }: K) => <span className="inline-flex flex-wrap items-center justify-center gap-x-1">{children}</span>;
  const Fr = ({ n, d }: { n: React.ReactNode; d: React.ReactNode }) => (
    <span className="mx-0.5 inline-flex flex-col items-stretch text-center align-middle leading-5">
      <span className="border-b-[1.5px] border-foreground/70 px-1 pb-0.5">{n}</span><span className="px-1 pt-0.5">{d}</span>
    </span>
  );
  const P = ({ children }: K) => <span className="eq-paren inline-flex items-center gap-x-1 border-x-[1.5px] border-primary px-2 py-0.5">{children}</span>;

  const Ceil = P;
  const Floor = P;

  const need = (fx: Formulas, com = false) => (
    <Eq n={1} title="معادلة الاستهلاك اليومي">
      <L>
        <Ln l="الاستهلاك الشهري"><Fr n="الفاتورة" d="سعر الكيلووات" /></Ln>
        {com && <><Ln l="أو مباشرة">الكيلووات الشهري</Ln><Ln l="أو"><Fr n="لترات الديزل" d={<V>0.27</V>} /></Ln></>}
        <Ln l="الاستهلاك اليومي"><Fr n="الاستهلاك الشهري" d="أيام الشهر" /></Ln>
      </L>
      <Num label="سعر الكيلووات (ريال يمني)" value={kwh} onChange={setKwh} />
      <Num label="أيام الشهر" value={fx.days} onChange={(v) => up({ days: v })} />
    </Eq>
  );
  const per = (v: number, fx: Formulas) => Math.max(1, Math.floor(v / (fx.panelVoc * fx.coldFactor)));
  const items = (fx: Formulas, hv: boolean, single = false) => {
    const vmax = hv ? fx.vmaxHV : fx.vmaxThree;
    let n = 0;
    return (<>
      {need(fx, !single)}
      <Eq n={++n + 1} title="صنف الألواح الشمسية">
        <L>
          <Ln l={<>قدرة الألواح <V>kWp</V></>}><Fr n="الاستهلاك اليومي" d="ساعات الإشعاع" /></Ln>
          <Ln l="العدد الأولي"><Ceil><Fr n={<R><V>kWp</V><O c="×" /><V>1000</V></R>} d="قدرة اللوح" /></Ceil></Ln>
          <Ln l="أقصى ألواح بالاسترنق"><Floor><Fr n="أقصى جهد الإنفرتر" d={<R><V>Voc</V><O c="×" />معامل الحرارة</R>} /></Floor></Ln>
          <Ln l="عدد الاسترنقات"><Ceil><Fr n="العدد الأولي" d="أقصى ألواح بالاسترنق" /></Ceil></Ln>
          <Ln l="الألواح النهائية">الاسترنقات<O c="×" /><Ceil><Fr n="العدد الأولي" d="الاسترنقات" /></Ceil></Ln>
          <Nt>الأعداد تُقرَّب للأعلى، وأقصى ألواح بالاسترنق يُقرَّب للأسفل</Nt>
        </L>
        <Num label="ساعات الإشعاع اليومي" value={fx.sun} onChange={(v) => up({ sun: v })} />
        <Num label="قدرة اللوح (واط)" value={fx.panelW} onChange={(v) => up({ panelW: v })} />
        <Num label="جهد اللوح Voc (فولت)" value={fx.panelVoc} onChange={(v) => up({ panelVoc: v })} />
        <Num label="معامل الأمان الحراري" value={fx.coldFactor} onChange={(v) => up({ coldFactor: v })} />
        {!hv && <Num label="أقصى جهد إنفرتر سنجل فاز (فولت)" value={fx.vmaxSingle} onChange={(v) => up({ vmaxSingle: v })} />}
        {!hv && !single && <Num label="أقصى جهد إنفرتر ثري فاز (فولت)" value={fx.vmaxThree} onChange={(v) => up({ vmaxThree: v })} />}
        {hv && <Num label="أقصى جهد إنفرتر هاي فولتج (فولت)" value={fx.vmaxHV} onChange={(v) => up({ vmaxHV: v })} />}
        <p className="text-xs text-muted-foreground">النتيجة الآن: {single ? `سنجل ${per(fx.vmaxSingle, fx)} لوح بالاسترنق` : hv ? `هاي فولتج ${per(vmax, fx)} لوح بالاسترنق` : `سنجل ${per(fx.vmaxSingle, fx)} · ثري ${per(fx.vmaxThree, fx)} لوح بالاسترنق`}</p>
      </Eq>
      <Eq n={++n + 1} title={hv ? "صنف إنفرتر الجهد العالي" : single ? "صنف الإنفرتر (Single Phase 8 / 12)" : "صنف الإنفرتر"}>
        <L>
          <Ln l="القدرة المطلوبة">الأكبر من<P>حمل الذروة<O c="،" /><Fr n={<V>kWp</V>} d="نسبة الألواح للإنفرتر" /></P></Ln>
          <Ln l="عدد الإنفرترات"><Ceil><Fr n="القدرة المطلوبة" d="قدرة الإنفرتر" /></Ceil></Ln>
          <Nt>عدد الإنفرترات لا يتجاوز الحد الأقصى بالتوازي</Nt>
          <Nt>{hv ? "يُستخدم الهاي فولتج عندما تتجاوز القدرة حد الجهد المنخفض" : "جهد منخفض ما دامت القدرة ≤ حد الجهد المنخفض"}</Nt>
          <Nt>يُختار الأرخص من الخيارات المناسبة</Nt>
        </L>
        <Num label="نسبة الألواح إلى الإنفرتر" value={fx.dcRatio} onChange={(v) => up({ dcRatio: v })} />
        <Num label="أقصى قدرة للجهد المنخفض (كيلو)" value={fx.lvMaxKw} onChange={(v) => up({ lvMaxKw: v })} />
        <Num label="أقصى عدد إنفرترات بالتوازي" value={fx.maxInverters} onChange={(v) => up({ maxInverters: Math.round(v) })} />
      </Eq>
      <Eq n={++n + 1} title={hv ? "صنف بطاريات الجهد العالي" : "صنف بطاريات الليثيوم"}>
        <L>
          <Ln l="استهلاك الليل">الاستهلاك اليومي<O c="×" />نسبة الليل</Ln>
          {(() => {
            const c = <Ceil><Fr n={<R>استهلاك الليل<O c="−" />السماحية</R>} d={<R>سعة البطارية<O c="×" />التفريغ</R>} /></Ceil>;
            return <Ln l="عدد البطاريات">{hv ? <>الأكبر من<P>أقل عدد<O c="،" />{c}</P></> : c}</Ln>;
          })()}
        </L>
        <Num label="نسبة الليل عند اختيار 30% ليل" value={fx.night[30]} onChange={(v) => up({ night: { ...fx.night, 30: v } })} />
        <Num label="نسبة الليل عند اختيار 50/50" value={fx.night[50]} onChange={(v) => up({ night: { ...fx.night, 50: v } })} />
        <Num label="نسبة الليل عند اختيار 70% ليل" value={fx.night[70]} onChange={(v) => up({ night: { ...fx.night, 70: v } })} />
        <Num label="معامل تفريغ البطارية" value={fx.dod} onChange={(v) => up({ dod: Math.min(v, 1) })} />
        <Num label="سعة البطارية (كيلووات ساعة)" value={fx.batKwh} onChange={(v) => up({ batKwh: v })} />
        <Num label="سماحية نقص الليل (كيلووات ساعة)" value={fx.batTol} onChange={(v) => up({ batTol: v })} />
        {hv && <Num label="أقل عدد بطاريات هاي فولتج" value={fx.hvMinBat} onChange={(v) => up({ hvMinBat: Math.round(v) })} />}
      </Eq>
      {hv && <Eq n={++n + 1} title="صنف وحدة التحكم BCU">
        <L><Ln l={<>عدد <V>BCU</V></>}><Ceil><Fr n="عدد البطاريات" d={<R>أقصى بطاريات لكل <V>BCU</V></R>} /></Ceil></Ln></L>
        <Num label="أقصى بطاريات لكل كنترول BCU" value={fx.hvBatPerBcu} onChange={(v) => up({ hvBatPerBcu: Math.round(v) })} />
      </Eq>}
      {hv && <Eq n={++n + 1} title="صنف صندوق تجميع البطاريات EBC">
        <L>
          <Ln l={<>عدد <V>EBC</V></>}><V>1</V></Ln>
          <Nt>يُضاف فقط عندما: عدد البطاريات ≥ <V>{2 * fx.hvMinBat}</V> (ضعف أقل عدد)</Nt>
        </L>
      </Eq>}
      {hv && <Eq n={++n + 1} title="صنف قاطع حماية البطاريات">
        <L><Ln l="عدد القواطع">عدد وحدات <V>BCU</V></Ln></L>
      </Eq>}
      <Eq n={++n + 1} title={hv ? "صنف صناديق حماية DC (1500V)" : "صنف صندوق حماية DC"}>
        <L>
          <Ln l="عدد الصناديق"><Ceil><Fr n="الاسترنقات" d="أقصى خطوط الصندوق" /></Ceil></Ln>
          <Ln l="خطوط الصندوق"><Ceil><Fr n="الاسترنقات" d={<R>الصناديق<O c="×" />خطوة التقريب</R>} /></Ceil><O c="×" />خطوة التقريب</Ln>
        </L>
        <Num label="أقصى عدد خطوط للصندوق" value={fx.dcMaxLines} onChange={(v) => up({ dcMaxLines: v })} />
        <Num label="خطوة التقريب (خطوط)" value={fx.dcStep} onChange={(v) => up({ dcStep: v })} />
      </Eq>
      <Eq n={++n + 1} title="صنف لوحة AC / لوحة التجميع">
        <L>
          {!hv && <Ln l="قاطع سنجل فاز"><Fr n="واط الإنفرترات" d="جهد السنجل" /><O c="×" />معامل الأمان</Ln>}
          {!single && <Ln l="قاطع ثري فاز"><Fr n="واط الإنفرترات" d={<R><V>√3</V><O c="×" /><V>380</V></R>} /><O c="×" />معامل الأمان</Ln>}
          {!single && <Nt>إنفرتر واحد ← لوحة AC · إنفرتران فأكثر ← لوحة تجميع</Nt>}
        </L>
        {!hv && <Num label="جهد سنجل فاز (فولت)" value={fx.acSingleV} onChange={(v) => up({ acSingleV: v })} />}
        {!single && <Num label="مقسوم ثري فاز (√3×380)" value={fx.acThreeDiv} onChange={(v) => up({ acThreeDiv: v })} />}
        <Num label="معامل الأمان" value={fx.acSafety} onChange={(v) => up({ acSafety: v })} />
      </Eq>
      <Eq n={++n + 1} title="صنف الكابل">
        <L><Ln l="أمتار الكابل">عدد الإنفرترات<O c="×" />متر لكل إنفرتر</Ln></L>
        <Num label="متر كابل لكل إنفرتر" value={fx.cableM} onChange={(v) => up({ cableM: v })} />
      </Eq>
      <Eq n={++n + 1} title="صنف كنشات MC4">
        <L><Ln l={<>أطقم <V>MC4</V></>}>عدد الاسترنقات<O c="×" />أطقم لكل استرنق</Ln></L>
        <Num label="أطقم الكنشات MC4 لكل استرنق" value={fx.mc4PerString} onChange={(v) => up({ mc4PerString: v })} />
      </Eq>
    </>);
  };

  const small = RES.map((p, i) => (/^إنفرتر (1\.6|6\.2) /.test(p.group) ? i : -1)).filter((i) => i >= 0);

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-2" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-bold">المعادلات</h2><button onClick={onClose} aria-label="إغلاق"><X className="h-4 w-4" /></button></div>
        <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold">
          {([["res", "معادلات النظام السكني"], ["com", "معادلات النظام التجاري"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-1 py-1.5 ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {!f ? <p className="text-xs text-muted-foreground">جاري التحميل…</p> : tab === "res" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold">
                <button onClick={() => setResSub("small")} className={`rounded-lg px-1 py-1.5 ${resSub === "small" ? "bg-ink text-ink-foreground" : "bg-muted"}`}>انفرتر 1.6 و 6.2</button>
                <button onClick={() => setResSub("big")} className={`rounded-lg px-1 py-1.5 ${resSub === "big" ? "bg-ink text-ink-foreground" : "bg-muted"}`}>انفرتر 8 و 12 Single Phase</button>
              </div>
              {resSub === "small" && (<>
                {need(f)}
                <Eq n={2} title="معادلة اختيار المنظومة (1.6 / 6.2)">
                  <p className="text-[11px] text-muted-foreground">تُقارن قيمة الاستهلاك اليومي بنطاق كل منظومة<br />يُختار أقرب نطاق<br />عند تساوي المسافة تُعرض المنظومتان<br />الألواح والإنفرتر حسب المنظومة المختارة (بدون خيارات أقل/أكثر)</p>
                  {small.map((i) => f.resRanges[i]!.map((v, j) => <Num key={i + "-" + j} label={RES[i]!.group + " · " + RES[i]!.title} value={v} onChange={(n) => setRange(i, j, n)} />))}
                </Eq>
                <Eq n={3} title="معادلة البطارية (1.6 / 6.2)">
                  <p className="text-[11px] text-muted-foreground">استهلاك الليل = الاستهلاك اليومي × نسبة الليل<br />السعة المتاحة = سعة بطارية المنظومة × معامل التفريغ<br />إذا كانت المتاحة + السماحية ≥ استهلاك الليل تبقى البطارية<br />غير ذلك تُرفع إلى البطارية الأكبر<br />السكني: خياران فقط 50/50 و 70% ليل</p>
                  <Num label="نسبة الليل عند اختيار 50/50" value={f.night[50]} onChange={(v) => up({ night: { ...f.night, 50: v } })} />
                  <Num label="نسبة الليل عند اختيار 70% ليل" value={f.night[70]} onChange={(v) => up({ night: { ...f.night, 70: v } })} />
                  <Num label="معامل تفريغ البطارية" value={f.dod} onChange={(v) => up({ dod: Math.min(v, 1) })} />
                  <Num label="سماحية نقص الليل (كيلووات ساعة)" value={f.batTol} onChange={(v) => up({ batTol: v })} />
                </Eq>
              </>)}
              {resSub === "big" && (<>
                {items(f, false, true)}
              </>)}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold">
                <button onClick={() => setComSub("lv")} className={`rounded-lg px-1 py-1.5 ${comSub === "lv" ? "bg-ink text-ink-foreground" : "bg-muted"}`}>Low Voltage (8–20)</button>
                <button onClick={() => setComSub("hv")} className={`rounded-lg px-1 py-1.5 ${comSub === "hv" ? "bg-ink text-ink-foreground" : "bg-muted"}`}>High Voltage (50/80/125)</button>
              </div>
              {comSub === "lv" && items(f, false)}
              {comSub === "hv" && items(f, true)}
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
