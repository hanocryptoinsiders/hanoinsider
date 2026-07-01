"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { isPlanId, isValidEmail } from "@/lib/payments";
import type { PublicCryptoSettings } from "@/lib/crypto-payments";

type Step = "form" | "done" | "expired";

type Intent = {
  id: string;
  status: "pending" | "confirmed" | "expired" | "failed";
  walletAddress: string;
  amount: number;
  currency: string;
  network: string;
  networkLabel: string;
  chainId: number;
  expiresAt: string;
  windowMinutes: number;
  email: string;
  planName: string;
  transactionHash: string | null;
};

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(data)}`;
}

/** Highlights the first two and last two characters so buyers can sanity-check the address. */
function HighlightedAddress({ address }: { address: string }) {
  const hasPrefix = address.toLowerCase().startsWith("0x");
  const prefix = hasPrefix ? address.slice(0, 2) : "";
  const body = hasPrefix ? address.slice(2) : address;
  if (body.length < 4) return <code className="crypto-pay__wallet-code">{address}</code>;
  const head = body.slice(0, 2);
  const middle = body.slice(2, -2);
  const tail = body.slice(-2);
  const mark = "rounded bg-[var(--accent-soft,#9b82dc)]/25 px-0.5 font-bold text-white";
  return (
    <code className="crypto-pay__wallet-code">
      {prefix}
      <span className={mark}>{head}</span>
      {middle}
      <span className={mark}>{tail}</span>
    </code>
  );
}

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CryptoPaymentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const planId = planParam && isPlanId(planParam) ? planParam : null;

  const [settings, setSettings] = useState<PublicCryptoSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState(() => {
    const first = searchParams.get("firstName")?.trim() ?? "";
    const last = searchParams.get("lastName")?.trim() ?? "";
    return [first, last].filter(Boolean).join(" ");
  });
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() ?? "");
  const [blockNotice, setBlockNotice] = useState<{ message: string; href: string; label: string } | null>(null);

  const [creating, setCreating] = useState(false);
  const [intentStartFailed, setIntentStartFailed] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!planId) router.replace("/#pricing");
  }, [planId, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/crypto/settings");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load payment settings");
        if (!cancelled) setSettings(data);
      } catch (e) {
        if (!cancelled) setSettingsError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlan = useMemo(
    () => (planId && settings ? settings.plans.find((p) => p.id === planId) ?? null : null),
    [settings, planId],
  );

  const emailValid = isValidEmail(email.trim());
  const canStart = Boolean(fullName.trim() && emailValid && !blockNotice);

  useEffect(() => {
    setIntentStartFailed(false);
  }, [fullName, email]);

  const createIntent = useCallback(async () => {
    if (!planId) return;
    setCreating(true);
    setIntentStartFailed(false);
    try {
      const res = await fetch("/api/crypto/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), planId }),
      });

      let data: { error?: string; code?: string; intent?: Intent } = {};
      try {
        data = await res.json();
      } catch {
        toast.error("Could not start payment. Please try again.");
        setIntentStartFailed(true);
        return;
      }

      if (!res.ok) {
        if (data.code === "active_subscriber" || data.code === "already_registered") {
          setBlockNotice({ message: data.error || "Please log in.", href: "/login", label: "Log in" });
        } else if (data.code === "already_paid") {
          setBlockNotice({
            message: data.error || "Payment already completed.",
            href: `/register?email=${encodeURIComponent(email.trim())}`,
            label: "Create your account",
          });
        } else if (data.code === "server_config") {
          toast.error("Crypto payments are temporarily unavailable. Please use card checkout or contact support.");
          setIntentStartFailed(true);
        } else {
          toast.error(data.error || "Could not start payment.");
          setIntentStartFailed(true);
        }
        return;
      }
      setIntent(data.intent as Intent);
      setNowTs(Date.now());
    } catch {
      toast.error("Could not start payment. Please try again.");
      setIntentStartFailed(true);
    } finally {
      setCreating(false);
    }
  }, [planId, fullName, email]);

  const msLeft = intent ? new Date(intent.expiresAt).getTime() - nowTs : 0;

  // Countdown + auto-expire once the window elapses.
  useEffect(() => {
    if (step !== "form" || !intent) return;
    const t = setInterval(() => {
      const now = Date.now();
      setNowTs(now);
      if (new Date(intent.expiresAt).getTime() - now <= 0) setStep("expired");
    }, 1000);
    return () => clearInterval(t);
  }, [step, intent]);

  const copyAddress = useCallback(async () => {
    const address = intent?.walletAddress ?? settings?.walletAddress;
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Wallet address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy address");
    }
  }, [intent, settings]);

  const handleVerify = async () => {
    if (!intent) {
      toast.info("Click “Start payment window” first after entering your details.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/crypto/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentId: intent.id,
          transactionHash: transactionHash.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.intent) setIntent(data.intent as Intent);
      if (data.status === "confirmed") setStep("done");
      else if (data.status === "expired" || data.status === "failed") setStep("expired");
      else toast.info("Payment not detected yet. Wait a few seconds after sending, then click verify again.");
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const restart = () => {
    setIntent(null);
    setTransactionHash("");
    setIntentStartFailed(false);
    setStep("form");
    setNowTs(Date.now());
  };

  if (!planId || loadingSettings) {
    return (
      <div className="crypto-pay__loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (settingsError || !settings?.enabled || !selectedPlan) {
    return (
      <div className="crypto-pay bg-noise">
        <div className="crypto-pay__overlay" />
        <div className="crypto-pay__inner flex items-center justify-center min-h-screen">
          <div className="crypto-pay__card max-w-md w-full text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-4" />
            <h1 className="crypto-pay__title">Crypto payments unavailable</h1>
            <p className="crypto-pay__subtitle mx-auto mt-3">
              {settingsError || "Crypto payments are not configured yet. Please contact support."}
            </p>
            <Link href="/#pricing" className="crypto-pay__done-link inline-block mt-6">
              Back to pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const amount = intent?.amount ?? selectedPlan.amountUsd;
  const currency = intent?.currency ?? settings.currency;
  const networkLabel = intent?.networkLabel ?? settings.networkLabel;
  const walletAddress = intent?.walletAddress ?? settings.walletAddress;

  return (
    <div className="crypto-pay bg-noise">
      <img src="/assets/hanoinfrontend/bird-mascot.jpg" alt="" className="crypto-pay__bg" />
      <div className="crypto-pay__overlay" />
      <div className="crypto-pay__glow" />

      <div className="crypto-pay__inner">
        <Link href="/#pricing" className="crypto-pay__back">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to pricing
        </Link>

        <div className="crypto-pay__brand">
          <LogoMark size={32} />
          <span className="crypto-pay__brand-name">Hano Insiders</span>
        </div>

        <div className="crypto-pay__eyebrow">
          <span className="pulse-dot" />
          <span>Crypto checkout · USDC or USDT on {networkLabel}</span>
        </div>

        <h1 className="crypto-pay__title">Pay with crypto</h1>
        <p className="crypto-pay__subtitle">
          Enter your details, click <strong>Start payment window</strong>, send{" "}
          <strong>{amount} {currency}</strong> (USDC or USDT) to the wallet below, then click{" "}
          <strong>Verify</strong>. Nothing is checked until you click verify.
        </p>

        <div className="crypto-pay__plan">
          <p className="crypto-pay__plan-label">Your selected plan</p>
          <p className="crypto-pay__plan-name">{selectedPlan.name}</p>
          <p className="crypto-pay__plan-meta">
            Pay exactly{" "}
            <strong>
              {amount} {currency}
            </strong>{" "}
            (USDC or USDT on {networkLabel})
          </p>
        </div>

        {step === "form" && (
          <div className="crypto-pay__space">
            {/* Wallet — always visible */}
            <section className="crypto-pay__card">
              <div className="crypto-pay__alert">
                <p>
                  Send the <strong>exact amount</strong> of{" "}
                  <strong>
                    {amount} {currency}
                  </strong>{" "}
                  (USDC or USDT) on <strong>{networkLabel}</strong> only.
                </p>
                <p>
                  Sending from an exchange? <strong>Don&apos;t deduct the fee from the amount</strong> — cover it on
                  top so we receive the full {amount}. Wrong network can mean <strong>loss of funds</strong>.
                </p>
              </div>

              <div className="crypto-pay__pay-grid">
                <div className="crypto-pay__qr">
                  <img src={qrUrl(walletAddress)} alt="Wallet QR code" width={200} height={200} />
                </div>
                <div className="crypto-pay__wallet-block">
                  <p className="crypto-pay__field-label">Receiving wallet ({networkLabel})</p>
                  <div className="crypto-pay__wallet-row">
                    <HighlightedAddress address={walletAddress} />
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="crypto-pay__copy"
                      aria-label="Copy wallet address"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--fg-3,#6b7079)]">
                    Check the highlighted first and last characters match before sending.
                  </p>
                  <div className="crypto-pay__meta-grid">
                    <div className="crypto-pay__meta-cell">
                      <span>Amount</span>
                      <strong>
                        {amount} {currency}
                      </strong>
                    </div>
                    <div className="crypto-pay__meta-cell">
                      <span>Network</span>
                      <strong>{networkLabel}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Countdown */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--border,#24272e)] bg-black/30 px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-[var(--fg-2,#c4c8d0)]">
                  <TimerReset className="h-4 w-4 text-[var(--accent-soft,#9b82dc)]" />
                  {intent ? "Time remaining to pay" : `Payment window: ${settings.windowMinutes} min`}
                </span>
                <span
                  className="font-mono text-xl font-bold tabular-nums"
                  style={{ color: intent && msLeft < 60_000 ? "#f87171" : "var(--accent-soft, #9b82dc)" }}
                >
                  {intent ? formatCountdown(msLeft) : `${settings.windowMinutes}:00`}
                </span>
              </div>
            </section>

            {/* Buyer details */}
            <section className="crypto-pay__card crypto-pay__space">
              <div>
                <h2 className="crypto-pay__form-title">Your details</h2>
                <p className="crypto-pay__form-meta">
                  We email your access here and match it when you create your account.
                </p>
              </div>

              <div className="crypto-pay__grid-2">
                <div className="crypto-pay__field">
                  <label className="crypto-pay__field-label">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="crypto-pay__input"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="crypto-pay__field">
                  <label className="crypto-pay__field-label">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setBlockNotice(null);
                      if (intent) setIntent(null);
                    }}
                    className="crypto-pay__input"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {blockNotice && (
                <div className="crypto-pay__alert">
                  <p>{blockNotice.message}</p>
                  <Link href={blockNotice.href} className="crypto-pay__done-link mt-2 inline-block">
                    {blockNotice.label}
                  </Link>
                </div>
              )}

              {intentStartFailed && !blockNotice && (
                <div className="crypto-pay__alert">
                  <p>Could not start the payment window. Check your connection or try card checkout.</p>
                </div>
              )}

              {!intent ? (
                <button
                  type="button"
                  onClick={() => void createIntent()}
                  disabled={creating || !canStart}
                  className="crypto-pay__btn-primary"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Starting payment window…
                    </>
                  ) : (
                    "Start payment window"
                  )}
                </button>
              ) : (
                <>
                  <div className="crypto-pay__field">
                    <label className="crypto-pay__field-label">Transaction reference (optional)</label>
                    <input
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      className="crypto-pay__input crypto-pay__input--mono"
                      placeholder="Paste your tx hash — or leave blank"
                    />
                    <p className="mt-1.5 text-[11px] text-[var(--fg-3,#6b7079)]">
                      Paid via a bridge/exchange (e.g. relay.link gives a Solana hash)? Leave this blank — we detect
                      your payment automatically by amount.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifying}
                    className="crypto-pay__btn-primary"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking the blockchain…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> I&apos;ve paid — verify now
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-[var(--fg-3,#6b7079)]">
                    After sending, wait a few seconds for the network to confirm, then click verify.
                  </p>
                </>
              )}
            </section>

            <p className="crypto-pay__support">
              <ShieldCheck className="h-3.5 w-3.5" />
              Support: {settings.supportEmail}
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="crypto-pay__card crypto-pay__done">
            <CheckCircle2 className="crypto-pay__done-icon" />
            <h2>Payment received</h2>
            <p>
              We confirmed your{" "}
              <strong className="text-foreground">
                {intent?.amount ?? amount} {currency}
              </strong>{" "}
              payment on-chain and your access is active. Create your account with{" "}
              <strong className="text-foreground">{intent?.email ?? email}</strong> to enter the dashboard.
            </p>
            <Link
              href={`/register?email=${encodeURIComponent(intent?.email ?? email)}`}
              className="crypto-pay__done-link"
            >
              Create your account
            </Link>
          </div>
        )}

        {step === "expired" && (
          <div className="crypto-pay__card crypto-pay__done">
            <TimerReset className="crypto-pay__done-icon" style={{ color: "#f59e0b" }} />
            <h2>Payment window closed</h2>
            <p>
              We didn&apos;t detect your payment within the window. If you already sent the funds they are safe —
              start a new payment to re-check the same wallet, or contact{" "}
              <strong className="text-foreground">{settings.supportEmail}</strong> with your transaction details.
            </p>
            <div className="crypto-pay__form-actions mt-4">
              <button type="button" onClick={restart} className="crypto-pay__btn-primary">
                Start a new payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
