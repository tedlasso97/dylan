import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiHelpCircle, FiTarget, FiTrendingUp } from "react-icons/fi";
import Layout from "@/components/Layout";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type AccountType = "RRIF" | "LIF" | "RRSP" | "FHSA" | "TFSA" | "RESP" | "BANK";
type ProvinceCode = "AB" | "BC" | "MB" | "NB" | "NL" | "NS" | "ON" | "PE" | "QC" | "SK";

/** Upper bound for TFSA cash dividend yield in UI (15% — covers 10–12% band with headroom). */
const MAX_TFSA_DIVIDEND_YIELD = 0.15;

interface AccountInput {
  id: string;
  type: AccountType;
  balance: number;
  annualReturnPct: number;
}

type SweepTarget = "resp" | "rrsp" | "fhsa" | "bank";

interface StrategyInput {
  age: number;
  province: ProvinceCode;
  incomeCad: number;
  annualSurplusCad: number;
  annualLivingSpendCad: number;
  /** Annual cash dividend yield inside TFSA only (e.g. 0.10 = 10%). Unrealized cap gains inside TFSA are not modeled. */
  assumedTfsaDividendYield: number;
  /** Extra non-reg price return if the same dollars were invested outside TFSA (optional; default 0). */
  assumedNonRegCapitalAppreciation: number;
  tfsaRoomCad: number;
  rrspRoomCad: number;
  fhsaRoomCad: number;
  respRoomCad: number;
  expectedTaxRateInRetirement: number;
}

interface PartnerInput {
  name: string;
  age: number;
  incomeCad: number;
  annualSurplusCad: number;
  annualLivingSpendCad: number;
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

const PROVINCE_OPTIONS: { code: ProvinceCode; label: string }[] = [
  { code: "AB", label: "Alberta" },
  { code: "BC", label: "British Columbia" },
  { code: "MB", label: "Manitoba" },
  { code: "NB", label: "New Brunswick" },
  { code: "NL", label: "Newfoundland and Labrador" },
  { code: "NS", label: "Nova Scotia" },
  { code: "ON", label: "Ontario" },
  { code: "PE", label: "Prince Edward Island" },
  { code: "QC", label: "Quebec" },
  { code: "SK", label: "Saskatchewan" },
];

type TaxBracket = { upTo: number; rate: number };

/**
 * Estimated combined marginal tax rates (federal + provincial) for regular income.
 * Brackets are simplified for planning and aligned to common published combined rates.
 */
const COMBINED_MARGINAL_TAX_BRACKETS: Record<ProvinceCode, TaxBracket[]> = {
  AB: [
    { upTo: 55867, rate: 0.25 },
    { upTo: 111733, rate: 0.305 },
    { upTo: 148269, rate: 0.36 },
    { upTo: 177922, rate: 0.38 },
    { upTo: 246752, rate: 0.41 },
    { upTo: Infinity, rate: 0.48 },
  ],
  BC: [
    { upTo: 49279, rate: 0.2006 },
    { upTo: 55867, rate: 0.227 },
    { upTo: 98560, rate: 0.2815 },
    { upTo: 113158, rate: 0.31 },
    { upTo: 127299, rate: 0.338 },
    { upTo: 172602, rate: 0.383 },
    { upTo: 177922, rate: 0.41 },
    { upTo: 246752, rate: 0.438 },
    { upTo: 259829, rate: 0.466 },
    { upTo: Infinity, rate: 0.535 },
  ],
  MB: [
    { upTo: 55867, rate: 0.2525 },
    { upTo: 79925, rate: 0.2775 },
    { upTo: 111733, rate: 0.338 },
    { upTo: 173205, rate: 0.379 },
    { upTo: 177922, rate: 0.43 },
    { upTo: 246752, rate: 0.434 },
    { upTo: Infinity, rate: 0.5035 },
  ],
  NB: [
    { upTo: 51306, rate: 0.244 },
    { upTo: 55867, rate: 0.255 },
    { upTo: 102614, rate: 0.295 },
    { upTo: 111733, rate: 0.335 },
    { upTo: 173205, rate: 0.355 },
    { upTo: 177922, rate: 0.395 },
    { upTo: 246752, rate: 0.44 },
    { upTo: Infinity, rate: 0.529 },
  ],
  NL: [
    { upTo: 43198, rate: 0.238 },
    { upTo: 55867, rate: 0.323 },
    { upTo: 86395, rate: 0.373 },
    { upTo: 111733, rate: 0.383 },
    { upTo: 154244, rate: 0.413 },
    { upTo: 215943, rate: 0.443 },
    { upTo: 246752, rate: 0.483 },
    { upTo: 431887, rate: 0.513 },
    { upTo: 863775, rate: 0.523 },
    { upTo: 1295662, rate: 0.543 },
    { upTo: Infinity, rate: 0.583 },
  ],
  NS: [
    { upTo: 30507, rate: 0.2379 },
    { upTo: 55867, rate: 0.295 },
    { upTo: 61256, rate: 0.3167 },
    { upTo: 93000, rate: 0.35 },
    { upTo: 111733, rate: 0.3717 },
    { upTo: 150000, rate: 0.4175 },
    { upTo: 173205, rate: 0.4382 },
    { upTo: 177922, rate: 0.466 },
    { upTo: 246752, rate: 0.4975 },
    { upTo: Infinity, rate: 0.54 },
  ],
  ON: [
    { upTo: 52886, rate: 0.2005 },
    { upTo: 55867, rate: 0.2415 },
    { upTo: 105775, rate: 0.2965 },
    { upTo: 111733, rate: 0.3148 },
    { upTo: 150000, rate: 0.3543 },
    { upTo: 173205, rate: 0.3729 },
    { upTo: 177922, rate: 0.4341 },
    { upTo: 220000, rate: 0.4829 },
    { upTo: 246752, rate: 0.4975 },
    { upTo: Infinity, rate: 0.5353 },
  ],
  PE: [
    { upTo: 32656, rate: 0.237 },
    { upTo: 55867, rate: 0.287 },
    { upTo: 64313, rate: 0.327 },
    { upTo: 111733, rate: 0.377 },
    { upTo: 173205, rate: 0.405 },
    { upTo: 177922, rate: 0.437 },
    { upTo: 246752, rate: 0.447 },
    { upTo: Infinity, rate: 0.517 },
  ],
  QC: [
    { upTo: 53255, rate: 0.2675 },
    { upTo: 55867, rate: 0.32 },
    { upTo: 106495, rate: 0.36 },
    { upTo: 111733, rate: 0.3745 },
    { upTo: 129590, rate: 0.45 },
    { upTo: 173205, rate: 0.47 },
    { upTo: 177922, rate: 0.4746 },
    { upTo: Infinity, rate: 0.5311 },
  ],
  SK: [
    { upTo: 53463, rate: 0.255 },
    { upTo: 55867, rate: 0.26 },
    { upTo: 106717, rate: 0.295 },
    { upTo: 111733, rate: 0.32 },
    { upTo: 142058, rate: 0.35 },
    { upTo: 173205, rate: 0.375 },
    { upTo: 177922, rate: 0.41 },
    { upTo: 246752, rate: 0.435 },
    { upTo: Infinity, rate: 0.475 },
  ],
};

const marginalRateFromIncomeCad = (income: number, province: ProvinceCode): number => {
  const brackets = COMBINED_MARGINAL_TAX_BRACKETS[province];
  for (const bracket of brackets) {
    if (income <= bracket.upTo) return bracket.rate;
  }
  return brackets[brackets.length - 1].rate;
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
  province: PROVINCE_OPTIONS.some((p) => p.code === raw?.province) ? (raw?.province as ProvinceCode) : "AB",
  incomeCad: Math.max(0, toFiniteNumber(raw?.incomeCad, 145000)),
  annualSurplusCad: Math.max(0, toFiniteNumber(raw?.annualSurplusCad, 40000)),
  annualLivingSpendCad: Math.max(0, toFiniteNumber(raw?.annualLivingSpendCad, 90000)),
  assumedTfsaDividendYield: clamp(toFiniteNumber(raw?.assumedTfsaDividendYield, 0.11), 0, MAX_TFSA_DIVIDEND_YIELD),
  assumedNonRegCapitalAppreciation: clamp(toFiniteNumber(raw?.assumedNonRegCapitalAppreciation, 0), 0, 1),
  tfsaRoomCad: Math.max(0, toFiniteNumber(raw?.tfsaRoomCad, 7000)),
  rrspRoomCad: Math.max(0, toFiniteNumber(raw?.rrspRoomCad, 22000)),
  fhsaRoomCad: Math.max(0, toFiniteNumber(raw?.fhsaRoomCad, 8000)),
  respRoomCad: Math.max(0, toFiniteNumber(raw?.respRoomCad, 2500)),
  expectedTaxRateInRetirement: clamp(toFiniteNumber(raw?.expectedTaxRateInRetirement, 0.3), 0, 1),
});

const sanitizePartnerInput = (raw: Partial<PartnerInput> | null | undefined): PartnerInput => ({
  name: typeof raw?.name === "string" && raw.name.trim().length > 0 ? raw.name : "Partner",
  age: clamp(Math.round(toFiniteNumber(raw?.age, 40)), 0, 150),
  incomeCad: Math.max(0, toFiniteNumber(raw?.incomeCad, 90000)),
  annualSurplusCad: Math.max(0, toFiniteNumber(raw?.annualSurplusCad, 20000)),
  annualLivingSpendCad: Math.max(0, toFiniteNumber(raw?.annualLivingSpendCad, 50000)),
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

const defaultReturnPctForType = (type: AccountType): number => {
  if (type === "BANK") return 3;
  return 5;
};

export default function StrategyPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [input, setInput] = useState<StrategyInput>({
    age: 42,
    province: "AB",
    incomeCad: 145000,
    annualSurplusCad: 40000,
    annualLivingSpendCad: 90000,
    assumedTfsaDividendYield: 0.11,
    assumedNonRegCapitalAppreciation: 0,
    tfsaRoomCad: 7000,
    rrspRoomCad: 22000,
    fhsaRoomCad: 8000,
    respRoomCad: 2500,
    expectedTaxRateInRetirement: 0.3,
  });
  const [sweepTarget, setSweepTarget] = useState<SweepTarget>("rrsp");
  const [compoundInsideTfsa, setCompoundInsideTfsa] = useState(true);
  const [accounts, setAccounts] = useState<AccountInput[]>([
    { id: uid(), type: "RRIF", balance: 500000, annualReturnPct: 5 },
    { id: uid(), type: "TFSA", balance: 120000, annualReturnPct: 5 },
    { id: uid(), type: "BANK", balance: 30000, annualReturnPct: 3 },
  ]);
  const [includePartner, setIncludePartner] = useState(false);
  const [partner, setPartner] = useState<PartnerInput>({
    name: "Partner",
    age: 40,
    incomeCad: 90000,
    annualSurplusCad: 20000,
    annualLivingSpendCad: 50000,
  });
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.input) setInput(sanitizeStrategyInput(parsed.input));
      if (parsed?.sweepTarget && ["resp", "rrsp", "fhsa", "bank"].includes(parsed.sweepTarget)) {
        setSweepTarget(parsed.sweepTarget as SweepTarget);
      } else if (parsed?.sweep) {
        const legacySweep = parsed.sweep as Partial<Record<SweepTarget, boolean>>;
        if (legacySweep.resp) setSweepTarget("resp");
        else if (legacySweep.rrsp) setSweepTarget("rrsp");
        else if (legacySweep.fhsa) setSweepTarget("fhsa");
        else setSweepTarget("bank");
      }
      if (typeof parsed?.compoundInsideTfsa === "boolean") setCompoundInsideTfsa(parsed.compoundInsideTfsa);
      if (Array.isArray(parsed?.accounts)) setAccounts(sanitizeAccounts(parsed.accounts));
      if (typeof parsed?.includePartner === "boolean") setIncludePartner(parsed.includePartner);
      if (parsed?.partner) setPartner(sanitizePartnerInput(parsed.partner));
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
        sweepTarget,
        compoundInsideTfsa,
        accounts,
        includePartner,
        partner,
        isDarkMode,
      })
    );
  }, [input, sweepTarget, compoundInsideTfsa, accounts, includePartner, partner, isDarkMode]);

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
  const balanceForType = (type: AccountType) =>
    accounts.filter((a) => a.type === type).reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const setBalanceForType = (type: AccountType, balance: number) => {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.type === type);
      if (idx === -1) return [...prev, { id: uid(), type, balance, annualReturnPct: defaultReturnPctForType(type) }];
      return prev.map((a, i) => (i === idx ? { ...a, balance } : a));
    });
  };
  const cardClass = cx(
    "rounded-2xl border p-5 glass-panel",
    themed("border-white/60 text-slate-800", "border-white/10 text-slate-100")
  );
  const inputClass = cx(
    "mt-1 w-full rounded-xl px-3 py-2 glass-input"
  );
  const softTextClass = cx("text-sm", themed("text-slate-600", "text-slate-300"));
  const householdIncomeCad = includePartner ? input.incomeCad + partner.incomeCad : input.incomeCad;
  const householdSurplusCad = includePartner ? input.annualSurplusCad + partner.annualSurplusCad : input.annualSurplusCad;
  const bracketRate = useMemo(
    () => marginalRateFromIncomeCad(householdIncomeCad, input.province),
    [householdIncomeCad, input.province]
  );

  const accountSummary = useMemo(() => {
    const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const projectedGrowth = accounts.reduce((s, a) => s + growthOn(Number(a.balance) || 0, Number(a.annualReturnPct) || 0), 0);
    // Annual tax drag in this model applies only to non-registered (BANK) growth. TFSA/RRSP/RRIF/etc. are not taxed yearly on growth here.
    const nonRegisteredGrowth = accounts
      .filter((a) => a.type === "BANK")
      .reduce((s, a) => s + growthOn(Number(a.balance) || 0, Number(a.annualReturnPct) || 0), 0);
    return { totalBalance, projectedGrowth, nonRegisteredGrowth };
  }, [accounts]);

  const tfsaBalance = useMemo(
    () => accounts.filter((a) => a.type === "TFSA").reduce((s, a) => s + (Number(a.balance) || 0), 0),
    [accounts]
  );

  const annualTfsaDividendCashCad = useMemo(
    () => Math.max(0, tfsaBalance * input.assumedTfsaDividendYield),
    [input.assumedTfsaDividendYield, tfsaBalance]
  );

  const dividendReinvestVsRegistered = useMemo(() => {
    const div = annualTfsaDividendCashCad;
    let rrspFromDiv = 0;
    let fhsaFromDiv = 0;
    let respFromDiv = 0;
    let grant = 0;
    let sweepAllocation = 0;

    if (sweepTarget === "resp") {
      sweepAllocation = Math.min(div, input.respRoomCad);
      respFromDiv = sweepAllocation;
      const rawGrant = sweepAllocation * 0.2;
      grant += Math.min(rawGrant, 500);
    } else if (sweepTarget === "rrsp") {
      sweepAllocation = Math.min(div, input.rrspRoomCad);
      rrspFromDiv = sweepAllocation;
    } else if (sweepTarget === "fhsa") {
      sweepAllocation = Math.min(div, input.fhsaRoomCad);
      fhsaFromDiv = sweepAllocation;
    } else {
      sweepAllocation = div;
    }

    const taxRefundFromSweep = (rrspFromDiv + fhsaFromDiv) * bracketRate;
    const registeredScore = taxRefundFromSweep + grant;
    const reinvestScore = div * input.assumedTfsaDividendYield;
    const pick: "reinvest" | "sweep" =
      div <= 0 ? "reinvest" : registeredScore >= reinvestScore ? "sweep" : "reinvest";

    return {
      div,
      rrspFromDiv,
      fhsaFromDiv,
      respFromDiv,
      sweepAllocation,
      unallocatedDividends: Math.max(0, div - sweepAllocation),
      grant,
      taxRefundFromSweep,
      registeredScore,
      reinvestScore,
      pick,
    };
  }, [
    annualTfsaDividendCashCad,
    bracketRate,
    input.assumedTfsaDividendYield,
    input.fhsaRoomCad,
    input.rrspRoomCad,
    input.respRoomCad,
    sweepTarget,
  ]);

  const strategyResults = useMemo<StrategyResult[]>(() => {
    const surplus = Math.max(0, householdSurplusCad);
    const nonRegGrowth = accountSummary.nonRegisteredGrowth;
    const annualTaxDragNonReg = nonRegGrowth * bracketRate;
    const tfsaContrib = compoundInsideTfsa ? Math.min(surplus, input.tfsaRoomCad) : 0;
    // One-year benefit: cash sheltered in TFSA avoids tax on the same dividend yield as if it were non-registered.
    // Uses ordinary-income marginal as a simple proxy (eligible dividend gross-up not modeled).
    // Same dividend stream if invested outside TFSA (cash dividends only), plus optional non-reg price return.
    const nonRegTaxableReturnProxy = input.assumedTfsaDividendYield + input.assumedNonRegCapitalAppreciation;
    const tfsaShelterValue = compoundInsideTfsa ? tfsaContrib * nonRegTaxableReturnProxy * bracketRate : 0;

    let taxSaved = 0;
    let grant = 0;
    const notes: string[] = [];
    let sweepAlloc = 0;
    let sweepLabel = "BANK";
    if (sweepTarget === "resp") {
      sweepAlloc = Math.min(surplus, input.respRoomCad);
      const rawGrant = sweepAlloc * 0.2;
      grant += Math.min(rawGrant, 500);
      sweepLabel = "RESP";
    } else if (sweepTarget === "rrsp") {
      sweepAlloc = Math.min(surplus, input.rrspRoomCad);
      taxSaved += sweepAlloc * bracketRate;
      sweepLabel = "RRSP";
    } else if (sweepTarget === "fhsa") {
      sweepAlloc = Math.min(surplus, input.fhsaRoomCad);
      taxSaved += sweepAlloc * bracketRate;
      sweepLabel = "FHSA";
    } else {
      sweepAlloc = surplus;
      sweepLabel = "BANK";
    }
    notes.push(`${sweepLabel} receives $${fmt(sweepAlloc)}`);

    // Net scores: surplus + strategy benefits only. Tax on *existing* non-registered (BANK) balances is shown
    // separately as taxedGrowthDragCad — applying it here made TFSA/compound rows go negative incorrectly.
    const sweepNet = surplus + taxSaved + grant;
    const tfsaOnlyNet = surplus + tfsaShelterValue;
    const mixedNet = surplus + taxSaved * 0.65 + grant * 0.7 + tfsaShelterValue * 0.6;

    return [
      {
        name: "Sweep Strategy",
        netOneYearCad: sweepNet,
        taxSavedCad: taxSaved,
        grantCad: grant,
        taxedGrowthDragCad: annualTaxDragNonReg,
        notes,
      },
      {
        name: "Compound Inside TFSA",
        netOneYearCad: tfsaOnlyNet,
        taxSavedCad: tfsaShelterValue,
        grantCad: 0,
        taxedGrowthDragCad: annualTaxDragNonReg,
        notes: [
          `TFSA contribution used: $${fmt(tfsaContrib)} (one-year shelter vs same ${pct(input.assumedTfsaDividendYield)} cash dividend yield outside TFSA${input.assumedNonRegCapitalAppreciation > 0 ? ` + ${pct(input.assumedNonRegCapitalAppreciation)} non-reg price return` : ""}; marginal proxy).`,
        ],
      },
      {
        name: "Balanced Mix",
        netOneYearCad: mixedNet,
        taxSavedCad: taxSaved * 0.65 + tfsaShelterValue * 0.6,
        grantCad: grant * 0.7,
        taxedGrowthDragCad: annualTaxDragNonReg,
        notes: ["Blends registered sweep with TFSA compounding."],
      },
    ];
  }, [
    accountSummary.nonRegisteredGrowth,
    bracketRate,
    compoundInsideTfsa,
    householdSurplusCad,
    input.fhsaRoomCad,
    input.respRoomCad,
    input.rrspRoomCad,
    input.tfsaRoomCad,
    input.assumedNonRegCapitalAppreciation,
    input.assumedTfsaDividendYield,
    sweepTarget,
  ]);

  const best = useMemo(
    () => strategyResults.reduce((max, current) => (current.netOneYearCad > max.netOneYearCad ? current : max), strategyResults[0]),
    [strategyResults]
  );

  const breakevens = useMemo(() => {
    const tfsaExpectedReturn = clamp(input.assumedTfsaDividendYield + input.assumedNonRegCapitalAppreciation, 0, 1);
    const bankNeededReturn = bracketRate >= 0.99 ? 0 : tfsaExpectedReturn / (1 - bracketRate);
    const rrspVsTfsaWithdrawalRate = input.expectedTaxRateInRetirement;
    const sweepVsTfsaDelta = strategyResults[0].netOneYearCad - strategyResults[1].netOneYearCad;
    return { bankNeededReturn, rrspVsTfsaWithdrawalRate, sweepVsTfsaDelta, tfsaExpectedReturn };
  }, [bracketRate, input.assumedNonRegCapitalAppreciation, input.assumedTfsaDividendYield, input.expectedTaxRateInRetirement, strategyResults]);

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
        label: "Approx. marginal rate stays in plausible range (0%-60%)",
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
                Canadian planning heuristic: compare reinvesting TFSA dividends vs sweeping them into registered accounts, using age, income, balances, and approximate marginal rates. Not tax advice.
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

          <div className={cx(cardClass, "space-y-3")}>
            <h2 className="text-lg font-semibold">TFSA dividends: reinvest vs registered sweep</h2>
            <p className={cx("text-sm", themed("text-slate-600", "text-slate-300"))}>
              Estimated annual cash dividends: <span className="font-semibold">${fmt(dividendReinvestVsRegistered.div)}</span> from TFSA balance{" "}
              <span className="font-semibold">${fmt(tfsaBalance)}</span> at <span className="font-semibold">{pct(input.assumedTfsaDividendYield)}</span>. Rule of thumb
              compares one-year registered refund from the selected sweep target (RESP/RRSP/FHSA/Bank) vs keeping dividends compounding inside the TFSA (proxy score).
            </p>
            <div
              className={cx(
                "rounded-xl border p-3 text-sm glass-panel-soft",
                themed(
                  dividendReinvestVsRegistered.pick === "sweep" ? "border-cyan-300/60 text-slate-800" : "border-emerald-300/60 text-slate-800",
                  dividendReinvestVsRegistered.pick === "sweep" ? "border-cyan-300/25 text-cyan-100" : "border-emerald-300/25 text-emerald-100"
                )
              )}
            >
              <div className="font-semibold">
                {dividendReinvestVsRegistered.pick === "sweep" ? "Lean: sweep dividends to registered (this year)" : "Lean: reinvest dividends inside TFSA (this year)"}
              </div>
              <div className={cx("mt-2 space-y-1", themed("text-slate-700", "text-slate-200"))}>
                <div>
                  Registered sweep score (refund + RESP grant):{" "}
                  <span className="font-semibold">${fmt(dividendReinvestVsRegistered.registeredScore)}</span>
                </div>
                <div>
                  Reinvest proxy (tax-free dividend-on-dividend compounding):{" "}
                  <span className="font-semibold">${fmt(dividendReinvestVsRegistered.reinvestScore)}</span>
                </div>
                <div className={cx("text-xs", themed("text-slate-600", "text-slate-400"))}>
                  Sweep target: <span className="font-semibold uppercase">{sweepTarget}</span>. Allocation from dividends: RESP ${fmt(dividendReinvestVsRegistered.respFromDiv)} | RRSP ${fmt(dividendReinvestVsRegistered.rrspFromDiv)} | FHSA $
                  {fmt(dividendReinvestVsRegistered.fhsaFromDiv)} | Unallocated ${fmt(dividendReinvestVsRegistered.unallocatedDividends)}. RESP grant (simplified): ${fmt(dividendReinvestVsRegistered.grant)}.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className={cx(cardClass, "space-y-4")}>
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
                <div className="md:col-span-3 rounded-xl border border-white/10 p-3 glass-panel-soft space-y-2">
                <div className="text-sm font-medium">TFSA cash dividend yield (typical 10–12%)</div>
                <input
                  type="range"
                  min={0}
                  max={MAX_TFSA_DIVIDEND_YIELD}
                  step={0.001}
                  value={input.assumedTfsaDividendYield}
                  onChange={(e) => {
                    const next = clamp(toFiniteNumber(e.target.value, input.assumedTfsaDividendYield), 0, MAX_TFSA_DIVIDEND_YIELD);
                    setInput((prev) => ({ ...prev, assumedTfsaDividendYield: next }));
                    setDraftValues((prev) => {
                      const { assumedTfsaDividendYield: _removed, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className="w-full accent-cyan-400"
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={MAX_TFSA_DIVIDEND_YIELD}
                    step="0.001"
                    value={displayNumber("assumedTfsaDividendYield", input.assumedTfsaDividendYield)}
                    onFocus={() => beginNumberDraft("assumedTfsaDividendYield", input.assumedTfsaDividendYield)}
                    onChange={(e) => updateNumberDraft("assumedTfsaDividendYield", e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        "assumedTfsaDividendYield",
                        (n) => setInput((prev) => ({ ...prev, assumedTfsaDividendYield: n })),
                        { min: 0, max: MAX_TFSA_DIVIDEND_YIELD }
                      )
                    }
                    className={cx(inputClass, "mt-0 flex-1")}
                  />
                  <span className={cx("text-xs sm:text-sm", themed("text-slate-600", "text-slate-300"))}>
                    Current: <span className="font-semibold">{pct(input.assumedTfsaDividendYield)}</span> (max {pct(MAX_TFSA_DIVIDEND_YIELD)})
                  </span>
                </div>
                </div>
              </div>
              <details className="rounded-xl border border-white/10 p-3 glass-panel-soft">
                <summary className={cx("cursor-pointer text-sm font-medium", themed("text-slate-800", "text-slate-100"))}>
                  Advanced inputs (province, surplus, partner, retirement rate…)
                </summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="text-sm">
                    Province
                    <select
                      value={input.province}
                      onChange={(e) => setInput((prev) => ({ ...prev, province: e.target.value as ProvinceCode }))}
                      className={inputClass}
                    >
                      {PROVINCE_OPTIONS.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.label}
                        </option>
                      ))}
                    </select>
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
                  <label className="text-sm md:col-span-2">
                    Non-reg price return if outside TFSA (optional)
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step="0.01"
                      value={displayNumber("assumedNonRegCapitalAppreciation", input.assumedNonRegCapitalAppreciation)}
                      onFocus={() => beginNumberDraft("assumedNonRegCapitalAppreciation", input.assumedNonRegCapitalAppreciation)}
                      onChange={(e) => updateNumberDraft("assumedNonRegCapitalAppreciation", e.target.value)}
                      onBlur={() =>
                        commitNumberDraft(
                          "assumedNonRegCapitalAppreciation",
                          (n) => setInput((prev) => ({ ...prev, assumedNonRegCapitalAppreciation: n })),
                          { min: 0, max: 1 }
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 p-3 glass-panel-soft">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includePartner}
                      onChange={(e) => setIncludePartner(e.target.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    Add spouse/partner profile
                  </label>
                  {includePartner ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="text-sm">
                        Partner Name
                        <input
                          type="text"
                          value={partner.name}
                          onChange={(e) => setPartner((prev) => ({ ...prev, name: e.target.value }))}
                          className={inputClass}
                        />
                      </label>
                      <label className="text-sm">
                        Partner Age
                        <input
                          type="number"
                          min={0}
                          max={150}
                          step={1}
                          value={displayNumber("partnerAge", partner.age)}
                          onFocus={() => beginNumberDraft("partnerAge", partner.age)}
                          onChange={(e) => updateNumberDraft("partnerAge", e.target.value)}
                          onBlur={() =>
                            commitNumberDraft(
                              "partnerAge",
                              (n) => setPartner((prev) => ({ ...prev, age: n })),
                              { min: 0, max: 150, round: true }
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-sm">
                        Partner Income (CAD)
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={displayNumber("partnerIncomeCad", partner.incomeCad)}
                          onFocus={() => beginNumberDraft("partnerIncomeCad", partner.incomeCad)}
                          onChange={(e) => updateNumberDraft("partnerIncomeCad", e.target.value)}
                          onBlur={() =>
                            commitNumberDraft(
                              "partnerIncomeCad",
                              (n) => setPartner((prev) => ({ ...prev, incomeCad: n })),
                              { min: 0 }
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-sm">
                        Partner Annual Surplus (CAD)
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={displayNumber("partnerAnnualSurplusCad", partner.annualSurplusCad)}
                          onFocus={() => beginNumberDraft("partnerAnnualSurplusCad", partner.annualSurplusCad)}
                          onChange={(e) => updateNumberDraft("partnerAnnualSurplusCad", e.target.value)}
                          onBlur={() =>
                            commitNumberDraft(
                              "partnerAnnualSurplusCad",
                              (n) => setPartner((prev) => ({ ...prev, annualSurplusCad: n })),
                              { min: 0 }
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-sm md:col-span-2">
                        Partner Living Spend (CAD)
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={displayNumber("partnerAnnualLivingSpendCad", partner.annualLivingSpendCad)}
                          onFocus={() => beginNumberDraft("partnerAnnualLivingSpendCad", partner.annualLivingSpendCad)}
                          onChange={(e) => updateNumberDraft("partnerAnnualLivingSpendCad", e.target.value)}
                          onBlur={() =>
                            commitNumberDraft(
                              "partnerAnnualLivingSpendCad",
                              (n) => setPartner((prev) => ({ ...prev, annualLivingSpendCad: n })),
                              { min: 0 }
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </details>
              <div className={cx("rounded-xl border p-3 text-sm glass-panel-soft", themed("border-emerald-300/60 text-emerald-800", "border-emerald-300/25 text-emerald-200"))}>
                Approx. combined federal + {PROVINCE_OPTIONS.find((p) => p.code === input.province)?.label} marginal rate:{" "}
                <span className="font-semibold">{pct(bracketRate)}</span> from{" "}
                {includePartner ? "household taxable income" : "taxable income"}.
                {includePartner ? (
                  <span className="ml-1">
                    Household income: <span className="font-semibold">${fmt(householdIncomeCad)}</span> and household surplus:{" "}
                    <span className="font-semibold">${fmt(householdSurplusCad)}</span>.
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-2">Account balances (core)</h2>
            <p className={cx("text-sm mb-4", themed("text-slate-600", "text-slate-300"))}>
              Enter current balances for the main buckets. Dividend cashflow uses the <span className="font-semibold">TFSA</span> balance × yield.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(
                [
                  { type: "TFSA" as const, label: "TFSA balance (CAD)" },
                  { type: "RRSP" as const, label: "RRSP balance (CAD)" },
                  { type: "RRIF" as const, label: "RRIF / LIF balance (CAD)" },
                  { type: "BANK" as const, label: "Non-registered cash / savings (CAD)" },
                ] as const
              ).map((row) => (
                <label className="text-sm" key={row.type}>
                  {row.label}
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={displayNumber(`balance-type-${row.type}`, balanceForType(row.type))}
                    onFocus={() => beginNumberDraft(`balance-type-${row.type}`, balanceForType(row.type))}
                    onChange={(e) => updateNumberDraft(`balance-type-${row.type}`, e.target.value)}
                    onBlur={() =>
                      commitNumberDraft(
                        `balance-type-${row.type}`,
                        (n) => setBalanceForType(row.type, n),
                        { min: 0 }
                      )
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
            <details className="mt-4 rounded-xl border border-white/10 p-3 glass-panel-soft">
              <summary className={cx("cursor-pointer text-sm font-medium", themed("text-slate-800", "text-slate-100"))}>
                Advanced: contribution room, per-account return %, extra accounts…
              </summary>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <button onClick={() => setAccounts([...accounts, { id: uid(), type: "BANK", balance: 0, annualReturnPct: 3 }])} className="rounded-xl glass-button px-4 py-2 text-sm font-medium">
                  Add Account Row
                </button>
                <div className={cx("text-sm", themed("text-slate-600", "text-slate-300"))}>
                  Total tracked balances: <span className="font-semibold">${fmt(accountSummary.totalBalance)}</span> | projected one-year growth:{" "}
                  <span className="font-semibold">${fmt(accountSummary.projectedGrowth)}</span>
                </div>
              </div>
            </details>
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
                      type="radio"
                      name="sweep-target"
                      checked={sweepTarget === (t.key as SweepTarget)}
                      onChange={() => setSweepTarget(t.key as SweepTarget)}
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
                      Tax saved / shelter: ${fmt(r.taxSavedCad)} | Grants: ${fmt(r.grantCad)} | Est. tax on existing bank growth: $
                      {fmt(r.taxedGrowthDragCad)}
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
                <li>
                  Non-registered pre-tax return needed to match a{" "}
                  <span className="font-semibold">{pct(breakevens.tfsaExpectedReturn)}</span> TFSA benchmark (dividend + optional price return; ordinary-income marginal proxy):{" "}
                  <span className="font-semibold">{pct(breakevens.bankNeededReturn)}</span>
                </li>
                <li>
                  RRSP/FHSA vs TFSA (rough): compare your expected retirement withdrawal rate{" "}
                  <span className="font-semibold">{pct(breakevens.rrspVsTfsaWithdrawalRate)}</span> (from profile) to current marginal{" "}
                  <span className="font-semibold">{pct(bracketRate)}</span> — not a full RRSP/FHSA optimizer.
                </li>
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
