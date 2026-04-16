import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiHelpCircle, FiTarget, FiTrendingUp } from "react-icons/fi";
import Layout from "@/components/Layout";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type Country = "CA" | "US";
type AccountType = "RRIF" | "LIF" | "RRSP" | "FHSA" | "TFSA" | "RESP" | "BANK";

interface AccountInput {
  id: string;
  type: AccountType;
  balance: number;
  annualReturnPct: number;
}

interface SweepToggles {
  resp: boolean;
  rrsp: boolean;
  fhsa: boolean;
  bank: boolean;
}

interface StrategyInput {
  age: number;
  country: Country;
  incomeCad: number;
  annualSurplusCad: number;
  annualLivingSpendCad: number;
  tfsaRoomCad: number;
  rrspRoomCad: number;
  fhsaRoomCad: number;
  respRoomCad: number;
  expectedTaxRateInRetirement: number;
}

interface StrategyResult {
  name: string;
  netOneYearCad: number;
  taxSavedCad: number;
  grantCad: number;
  taxedGrowthDragCad: number;
  notes: string[];
}

const STORAGE_KEY = "strategy-page-v1";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const marginalRateFromIncome = (income: number, country: Country): number => {
  if (country === "US") {
    if (income <= 15000) return 0.1;
    if (income <= 60000) return 0.22;
    if (income <= 120000) return 0.24;
    if (income <= 250000) return 0.32;
    return 0.37;
  }
  if (income <= 55867) return 0.205;
  if (income <= 111733) return 0.305;
  if (income <= 173205) return 0.36;
  if (income <= 246752) return 0.43;
  return 0.48;
};

const growthOn = (balance: number, annualReturnPct: number) => balance * (annualReturnPct / 100);

const fmt = (n: number) =>
  n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const sanitizeStrategyInput = (raw: Partial<StrategyInput> | null | undefined): StrategyInput => ({
  age: clamp(Math.round(toFiniteNumber(raw?.age, 42)), 0, 150),
  country: raw?.country === "US" ? "US" : "CA",
  incomeCad: Math.max(0, toFiniteNumber(raw?.incomeCad, 145000)),
  annualSurplusCad: Math.max(0, toFiniteNumber(raw?.annualSurplusCad, 40000)),
  annualLivingSpendCad: Math.max(0, toFiniteNumber(raw?.annualLivingSpendCad, 90000)),
  tfsaRoomCad: Math.max(0, toFiniteNumber(raw?.tfsaRoomCad, 7000)),
  rrspRoomCad: Math.max(0, toFiniteNumber(raw?.rrspRoomCad, 22000)),
  fhsaRoomCad: Math.max(0, toFiniteNumber(raw?.fhsaRoomCad, 8000)),
  respRoomCad: Math.max(0, toFiniteNumber(raw?.respRoomCad, 2500)),
  expectedTaxRateInRetirement: clamp(toFiniteNumber(raw?.expectedTaxRateInRetirement, 0.3), 0, 1),
});

const sanitizeAccounts = (raw: unknown): AccountInput[] => {
  if (!Array.isArray(raw)) return [];
  const validTypes: AccountType[] = ["RRIF", "LIF", "RRSP", "FHSA", "TFSA", "RESP", "BANK"];
  return raw.map((row) => {
    const candidate = row as Partial<AccountInput>;
    return {
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : uid(),
      type: validTypes.includes(candidate.type as AccountType) ? (candidate.type as AccountType) : "BANK",
      balance: Math.max(0, toFiniteNumber(candidate.balance, 0)),
      annualReturnPct: clamp(toFiniteNumber(candidate.annualReturnPct, 0), -100, 200),
    };
  });
};

export default function StrategyPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [input, setInput] = useState<StrategyInput>({
    age: 42,
    country: "CA",
    incomeCad: 145000,
    annualSurplusCad: 40000,
    annualLivingSpendCad: 90000,
    tfsaRoomCad: 7000,
    rrspRoomCad: 22000,
    fhsaRoomCad: 8000,
    respRoomCad: 2500,
    expectedTaxRateInRetirement: 0.3,
  });
  const [sweep, setSweep] = useState<SweepToggles>({
    resp: true,
    rrsp: true,
    fhsa: true,
    bank: true,
  });
  const [compoundInsideTfsa, setCompoundInsideTfsa] = useState(true);
  const [accounts, setAccounts] = useState<AccountInput[]>([
    { id: uid(), type: "RRIF", balance: 500000, annualReturnPct: 5 },
    { id: uid(), type: "TFSA", balance: 120000, annualReturnPct: 5 },
    { id: uid(), type: "BANK", balance: 30000, annualReturnPct: 3 },
  ]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.input) setInput(sanitizeStrategyInput(parsed.input));
      if (parsed?.sweep) setSweep(parsed.sweep);
      if (typeof parsed?.compoundInsideTfsa === "boolean") setCompoundInsideTfsa(parsed.compoundInsideTfsa);
      if (Array.isArray(parsed?.accounts)) setAccounts(sanitizeAccounts(parsed.accounts));
      if (typeof parsed?.isDarkMode === "boolean") setIsDarkMode(parsed.isDarkMode);
    } catch (err) {
      console.error("Failed to restore strategy page state", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        input,
        sweep,
        compoundInsideTfsa,
        accounts,
        isDarkMode,
      })
    );
  }, [input, sweep, compoundInsideTfsa, accounts, isDarkMode]);

  const themed = (light: string, dark: string) => (isDarkMode ? dark : light);
  const beginNumberDraft = (key: string, value: number) => {
    setDraftValues((prev) => ({ ...prev, [key]: String(value) }));
  };
  const updateNumberDraft = (key: string, raw: string) => {
    setDraftValues((prev) => ({ ...prev, [key]: raw }));
  };
  const commitNumberDraft = (
    key: string,
    apply: (n: number) => void,
    options?: { min?: number; max?: number; round?: boolean }
  ) => {
    const raw = (draftValues[key] ?? "").trim();
    let next = raw === "" ? 0 : toFiniteNumber(raw, 0);
    if (options?.round) next = Math.round(next);
    if (typeof options?.min === "number") next = Math.max(options.min, next);
    if (typeof options?.max === "number") next = Math.min(options.max, next);
    apply(next);
    setDraftValues((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };
  const displayNumber = (key: string, value: number) => (key in draftValues ? draftValues[key] : String(value));
  const cardClass = cx(
    "rounded-2xl border p-5 glass-panel",
    themed("border-white/60 text-slate-800", "border-white/10 text-slate-100")
  );
  const inputClass = cx(
    "mt-1 w-full rounded-xl px-3 py-2 glass-input"
  );
  const softTextClass = cx("text-sm", themed("text-slate-600", "text-slate-300"));
  const bracketRate = useMemo(() => marginalRateFromIncome(input.incomeCad, input.country), [input.incomeCad, input.country]);

  const accountSummary = useMemo(() => {
    const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const projectedGrowth = accounts.reduce((s, a) => s + growthOn(Number(a.balance) || 0, Number(a.annualReturnPct) || 0), 0);
    return { totalBalance, projectedGrowth };
  }, [accounts]);

  const strategyResults = useMemo<StrategyResult[]>(() => {
    const surplus = Math.max(0, input.annualSurplusCad);
    const growth = accountSummary.projectedGrowth;
    const bankTaxDrag = growth * bracketRate;
    const tfsaShelterValue = compoundInsideTfsa ? Math.min(surplus, input.tfsaRoomCad) * (bracketRate * 0.05) : 0;

    const sweepOrder: { key: keyof SweepToggles; room: number; taxCreditRate: number; grantRate: number; cap?: number; label: string }[] = [
      { key: "resp", room: input.respRoomCad, taxCreditRate: 0, grantRate: 0.2, cap: 500, label: "RESP" },
      { key: "rrsp", room: input.rrspRoomCad, taxCreditRate: bracketRate, grantRate: 0, label: "RRSP" },
      { key: "fhsa", room: input.fhsaRoomCad, taxCreditRate: bracketRate, grantRate: 0, label: "FHSA" },
      { key: "bank", room: Number.POSITIVE_INFINITY, taxCreditRate: 0, grantRate: 0, label: "BANK" },
    ];

    let remaining = surplus;
    let taxSaved = 0;
    let grant = 0;
    const notes: string[] = [];

    for (const step of sweepOrder) {
      if (!sweep[step.key]) continue;
      const alloc = Math.max(0, Math.min(remaining, step.room));
      if (alloc <= 0) continue;
      remaining -= alloc;
      taxSaved += alloc * step.taxCreditRate;
      if (step.grantRate > 0) {
        const rawGrant = alloc * step.grantRate;
        grant += typeof step.cap === "number" ? Math.min(rawGrant, step.cap) : rawGrant;
      }
      notes.push(`${step.label} receives $${fmt(alloc)}`);
      if (remaining <= 0) break;
    }

    const sweepNet = surplus + taxSaved + grant - bankTaxDrag;
    const tfsaOnlyNet = surplus + tfsaShelterValue - bankTaxDrag;
    const mixedNet = surplus + taxSaved * 0.65 + grant * 0.7 + tfsaShelterValue * 0.6 - bankTaxDrag;

    return [
      {
        name: "Sweep Strategy",
        netOneYearCad: sweepNet,
        taxSavedCad: taxSaved,
        grantCad: grant,
        taxedGrowthDragCad: bankTaxDrag,
        notes,
      },
      {
        name: "Compound Inside TFSA",
        netOneYearCad: tfsaOnlyNet,
        taxSavedCad: tfsaShelterValue,
        grantCad: 0,
        taxedGrowthDragCad: bankTaxDrag,
        notes: [`TFSA contribution used: $${fmt(Math.min(surplus, input.tfsaRoomCad))}`],
      },
      {
        name: "Balanced Mix",
        netOneYearCad: mixedNet,
        taxSavedCad: taxSaved * 0.65 + tfsaShelterValue * 0.6,
        grantCad: grant * 0.7,
        taxedGrowthDragCad: bankTaxDrag,
        notes: ["Blends registered sweep with TFSA compounding."],
      },
    ];
  }, [accountSummary.projectedGrowth, bracketRate, compoundInsideTfsa, input, sweep]);

  const best = useMemo(
    () => strategyResults.reduce((max, current) => (current.netOneYearCad > max.netOneYearCad ? current : max), strategyResults[0]),
    [strategyResults]
  );

  const breakevens = useMemo(() => {
    const tfsaExpectedReturn = 0.05;
    const bankNeededReturn = bracketRate >= 0.99 ? 0 : tfsaExpectedReturn / (1 - bracketRate);
    const rrspVsTfsaWithdrawalRate = bracketRate;
    const sweepVsTfsaDelta = strategyResults[0].netOneYearCad - strategyResults[1].netOneYearCad;
    return { bankNeededReturn, rrspVsTfsaWithdrawalRate, sweepVsTfsaDelta };
  }, [bracketRate, strategyResults]);

  const correctnessChecks = useMemo(() => {
    const monotonic = strategyResults.every((r) => Number.isFinite(r.netOneYearCad) && r.netOneYearCad >= 0);
    const taxBound = bracketRate >= 0 && bracketRate <= 0.6;
    const roomBound = input.tfsaRoomCad >= 0 && input.rrspRoomCad >= 0 && input.fhsaRoomCad >= 0 && input.respRoomCad >= 0;
    return [
      {
        label: "All strategy totals are finite and non-negative",
        ok: monotonic,
      },
      {
        label: "Auto-matched marginal tax rate stays in plausible range (0%-60%)",
        ok: taxBound,
      },
      {
        label: "Contribution room values are valid (>= 0)",
        ok: roomBound,
      },
    ];
  }, [strategyResults, bracketRate, input]);

  return (
    <div className={cx("min-h-screen", themed("bg-transparent text-gray-900", "bg-transparent text-gray-100"))}>
      <Layout isDarkMode={isDarkMode}>
        <div className="container mx-auto px-6 py-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Strategy Lab</h1>
              <p className={softTextClass}>
                Compare sweep vs TFSA compounding and find breakeven points by client profile.
              </p>
            </div>
            <button
              onClick={() => setIsDarkMode((v) => !v)}
              className={cx(
                "rounded-xl px-4 py-2 text-sm font-medium glass-button"
              )}
            >
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={cx(cardClass, "xl:col-span-2 space-y-4")}>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FiTarget className="h-5 w-5 rounded-md p-1 glass-panel-soft border border-white/20" />
                Client Profile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm">
                  Age
                  <input
                    type="number"
                    min={0}
                    max={150}
                    step={1}
                    value={displayNumber("age", input.age)}
                    onFocus={() => beginNumberDraft("age", input.age)}
                    onChange={(e) => updateNumberDraft("age", e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        "age",
                        (n) => setInput((prev) => ({ ...prev, age: n })),
                        { min: 0, max: 150, round: true }
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-sm">
                  Country
                  <select value={input.country} onChange={(e) => setInput({ ...input, country: e.target.value as Country })} className={inputClass}>
                    <option value="CA">Canada</option>
                    <option value="US">United States</option>
                  </select>
                </label>
                <label className="text-sm">
                  Income (CAD)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={displayNumber("incomeCad", input.incomeCad)}
                    onFocus={() => beginNumberDraft("incomeCad", input.incomeCad)}
                    onChange={(e) => updateNumberDraft("incomeCad", e.target.value)}
                    onBlur={() =>
                      commitNumberDraft("incomeCad", (n) => setInput((prev) => ({ ...prev, incomeCad: n })), { min: 0 })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-sm">
                  Annual Surplus (CAD)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={displayNumber("annualSurplusCad", input.annualSurplusCad)}
                    onFocus={() => beginNumberDraft("annualSurplusCad", input.annualSurplusCad)}
                    onChange={(e) => updateNumberDraft("annualSurplusCad", e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        "annualSurplusCad",
                        (n) => setInput((prev) => ({ ...prev, annualSurplusCad: n })),
                        { min: 0 }
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-sm">
                  Annual Living Spend (CAD)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={displayNumber("annualLivingSpendCad", input.annualLivingSpendCad)}
                    onFocus={() => beginNumberDraft("annualLivingSpendCad", input.annualLivingSpendCad)}
                    onChange={(e) => updateNumberDraft("annualLivingSpendCad", e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        "annualLivingSpendCad",
                        (n) => setInput((prev) => ({ ...prev, annualLivingSpendCad: n })),
                        { min: 0 }
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-sm">
                  Expected Retirement Tax Rate
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step="0.01"
                    value={displayNumber("expectedTaxRateInRetirement", input.expectedTaxRateInRetirement)}
                    onFocus={() => beginNumberDraft("expectedTaxRateInRetirement", input.expectedTaxRateInRetirement)}
                    onChange={(e) => updateNumberDraft("expectedTaxRateInRetirement", e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        "expectedTaxRateInRetirement",
                        (n) => setInput((prev) => ({ ...prev, expectedTaxRateInRetirement: n })),
                        { min: 0, max: 1 }
                      )
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <div className={cx("rounded-xl border p-3 text-sm glass-panel-soft", themed("border-emerald-300/60 text-emerald-800", "border-emerald-300/25 text-emerald-200"))}>
                Auto tax bracket match: <span className="font-semibold">{pct(bracketRate)}</span> marginal rate based on entered income.
              </div>
            </div>

            <div className={cx(cardClass, "space-y-4")}>
              <h2 className="text-lg font-semibold">Contribution Room</h2>
              {[
                { key: "tfsaRoomCad", label: "TFSA room" },
                { key: "rrspRoomCad", label: "RRSP room" },
                { key: "fhsaRoomCad", label: "FHSA room" },
                { key: "respRoomCad", label: "RESP room" },
              ].map((f) => (
                <label className="text-sm block" key={f.key}>
                  {f.label} (CAD)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={displayNumber(f.key, input[f.key as keyof StrategyInput] as number)}
                    onFocus={() => beginNumberDraft(f.key, input[f.key as keyof StrategyInput] as number)}
                    onChange={(e) => updateNumberDraft(f.key, e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        f.key,
                        (n) => setInput((prev) => ({ ...prev, [f.key]: n })),
                        { min: 0 }
                      )
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4">Accounts (RRIF / LIF / etc.)</h2>
            <div className="space-y-3">
              {accounts.map((a, index) => (
                <div key={a.id} className="grid grid-cols-12 gap-3">
                  <select value={a.type} onChange={(e) => {
                    const next = [...accounts];
                    next[index] = { ...next[index], type: e.target.value as AccountType };
                    setAccounts(next);
                  }} className={cx("col-span-3", inputClass)}>
                    {["RRIF", "LIF", "RRSP", "FHSA", "TFSA", "RESP", "BANK"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Balance"
                    value={displayNumber(`balance-${a.id}`, a.balance)}
                    onFocus={() => beginNumberDraft(`balance-${a.id}`, a.balance)}
                    onChange={(e) => updateNumberDraft(`balance-${a.id}`, e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        `balance-${a.id}`,
                        (n) =>
                          setAccounts((prev) =>
                            prev.map((row) => (row.id === a.id ? { ...row, balance: n } : row))
                          ),
                        { min: 0 }
                      )
                    }
                    className={cx("col-span-4", inputClass)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Return %"
                    value={displayNumber(`return-${a.id}`, a.annualReturnPct)}
                    onFocus={() => beginNumberDraft(`return-${a.id}`, a.annualReturnPct)}
                    onChange={(e) => updateNumberDraft(`return-${a.id}`, e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        `return-${a.id}`,
                        (n) =>
                          setAccounts((prev) =>
                            prev.map((row) => (row.id === a.id ? { ...row, annualReturnPct: n } : row))
                          ),
                        { min: -100, max: 200 }
                      )
                    }
                    className={cx("col-span-4", inputClass)}
                  />
                  <button onClick={() => setAccounts(accounts.filter((row) => row.id !== a.id))} className={cx("col-span-1 rounded-xl border glass-panel-soft", themed("border-rose-300/70 text-rose-600", "border-rose-300/20 text-rose-200"))}>x</button>
                </div>
              ))}
            </div>
            <button onClick={() => setAccounts([...accounts, { id: uid(), type: "BANK", balance: 0, annualReturnPct: 3 }])} className="mt-4 rounded-xl glass-button px-4 py-2 text-sm font-medium">
              Add Account
            </button>
            <div className={cx("mt-4 text-sm", themed("text-slate-600", "text-slate-300"))}>
              Total tracked balances: <span className="font-semibold">${fmt(accountSummary.totalBalance)}</span> | projected one-year growth:{" "}
              <span className="font-semibold">${fmt(accountSummary.projectedGrowth)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className={cx(cardClass, "space-y-4")}>
              <h2 className="text-lg font-semibold">Strategy Controls</h2>
              <div className="space-y-2">
                <p className="text-sm font-medium">Sweep to:</p>
                {[
                  { key: "resp", label: "RESP" },
                  { key: "rrsp", label: "RRSP" },
                  { key: "fhsa", label: "FHSA" },
                  { key: "bank", label: "Bank account" },
                ].map((t) => (
                  <label key={t.key} className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 glass-panel-soft border border-white/10">
                    <input
                      type="checkbox"
                      checked={sweep[t.key as keyof SweepToggles]}
                      onChange={(e) => setSweep({ ...sweep, [t.key]: e.target.checked })}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 glass-panel-soft border border-white/10">
                <input type="checkbox" checked={compoundInsideTfsa} onChange={(e) => setCompoundInsideTfsa(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
                Compound inside TFSA
              </label>
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FiTrendingUp className="h-5 w-5 rounded-md p-1 glass-panel-soft border border-white/20" />
                Best Strategy for This Client
              </h2>
              <div className={cx("rounded-xl p-3 border mb-3 glass-panel-soft", themed("border-emerald-300/60", "border-emerald-300/25"))}>
                <p className="text-sm">
                  <span className="font-semibold">{best.name}</span> currently leads with estimated one-year net value of{" "}
                  <span className="font-semibold">${fmt(best.netOneYearCad)}</span>.
                </p>
              </div>
              <div className="space-y-2">
                {strategyResults.map((r) => (
                  <div key={r.name} className={cx("rounded-xl border p-3 glass-panel-soft", themed("border-white/50", "border-white/10"))}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span>${fmt(r.netOneYearCad)}</span>
                    </div>
                    <div className={cx("text-xs mt-1", themed("text-slate-600", "text-slate-300"))}>
                      Tax saved: ${fmt(r.taxSavedCad)} | Grants: ${fmt(r.grantCad)} | Tax drag: ${fmt(r.taxedGrowthDragCad)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className={cardClass}>
              <h2 className="text-lg font-semibold mb-3">Breakevens</h2>
              <ul className={cx("space-y-2 text-sm", themed("text-slate-700", "text-slate-200"))}>
                <li>Bank pre-tax return needed to match 5% TFSA return at your bracket: <span className="font-semibold">{pct(breakevens.bankNeededReturn)}</span></li>
                <li>RRSP/FHSA vs TFSA breakeven future withdrawal tax rate: <span className="font-semibold">{pct(breakevens.rrspVsTfsaWithdrawalRate)}</span></li>
                <li>Sweep minus TFSA one-year edge: <span className="font-semibold">${fmt(breakevens.sweepVsTfsaDelta)}</span></li>
              </ul>
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FiHelpCircle className="h-5 w-5 rounded-md p-1 glass-panel-soft border border-white/20" />
                Correctness Checks
              </h2>
              <div className="space-y-2">
                {correctnessChecks.map((check) => (
                  <div key={check.label} className={cx("rounded-xl border p-3 text-sm flex items-center gap-2 glass-panel-soft", themed("border-white/50", "border-white/10"))}>
                    <FiCheckCircle className={cx("h-4 w-4", check.ok ? "text-green-500" : "text-red-500")} />
                    <span>{check.label}</span>
                    <span className={cx("ml-auto text-xs font-semibold", check.ok ? "text-green-600" : "text-red-600")}>{check.ok ? "PASS" : "CHECK"}</span>
                  </div>
                ))}
              </div>
              <p className={cx("text-xs mt-3", themed("text-slate-500", "text-slate-300"))}>
                This is a planning model, not tax advice. Validate with a licensed advisor before implementing.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
