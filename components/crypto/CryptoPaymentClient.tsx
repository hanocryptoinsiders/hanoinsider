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
  Upload,
  Wallet,
} from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { isPlanId, isValidEmail } from "@/lib/payments";
import type { PublicCryptoSettings } from "@/lib/crypto-payments";

type Step = "pay" | "proof" | "done";

type PaymentOption = PublicCryptoSettings["paymentOptions"][number];

const STEP_LABELS = ["Send payment", "Submit proof", "Done"];

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(data)}`;
}

function stepClass(step: Step, target: Step, index: number): string {
  const order = { pay: 0, proof: 1, done: 2 };
  const current = order[step];
  const pos = order[target];
  if (current === pos) return "crypto-pay__step crypto-pay__step--active";
  if (current > pos) return "crypto-pay__step crypto-pay__step--done";
  return "crypto-pay__step";
}

export function CryptoPaymentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const planId = planParam && isPlanId(planParam) ? planParam : null;

  const [settings, setSettings] = useState<PublicCryptoSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [step, setStep] = useState<Step>("pay");
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null);
  const [copied, setCopied] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!planId) router.replace("/#pricing");
  }, [planId, router]);

  useEffect(() => {
    const first = searchParams.get("firstName")?.trim() ?? "";
    const last = searchParams.get("lastName")?.trim() ?? "";
    const prefillEmail = searchParams.get("email")?.trim() ?? "";
    if (first || last) setFullName([first, last].filter(Boolean).join(" "));
    if (prefillEmail) setEmail(prefillEmail);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/crypto/settings");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load payment settings");
        if (!cancelled) {
          setSettings(data);
          if (data.paymentOptions?.length > 0) setSelectedOption(data.paymentOptions[0]);
        }
      } catch (e) {
        if (!cancelled) setSettingsError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedPlan = useMemo(
    () => (planId && settings ? settings.plans.find((p) => p.id === planId) ?? null : null),
    [settings, planId],
  );

  useEffect(() => {
    if (selectedPlan) setAmountPaid(String(selectedPlan.amountUsd));
  }, [selectedPlan]);

  const copyAddress = useCallback(async () => {
    if (!selectedOption?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(selectedOption.walletAddress);
      setCopied(true);
      toast.success("Wallet address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy address");
    }
  }, [selectedOption]);

  const validateProofForm = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = "Required";
    if (!email.trim()) errors.email = "Required";
    else if (!isValidEmail(email.trim())) errors.email = "Enter a valid email";
    if (!amountPaid.trim() || Number(amountPaid) <= 0) errors.amountPaid = "Enter the amount you sent";
    if (!transactionHash.trim()) errors.transactionHash = "Required";
    if (!senderWallet.trim()) errors.senderWallet = "Required";
    if (!selectedOption) errors.crypto = "Select a payment network";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProofForm() || !selectedOption || !selectedPlan || !planId) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("email", email.trim());
      formData.append("planId", planId);
      formData.append("amountPaid", amountPaid);
      formData.append("currency", selectedOption.currency);
      formData.append("network", selectedOption.network);
      formData.append("transactionHash", transactionHash.trim());
      formData.append("senderWalletAddress", senderWallet.trim());
      if (userNotes.trim()) formData.append("userNotes", userNotes.trim());
      if (proofFile) formData.append("proof", proofFile);

      const res = await fetch("/api/crypto/submissions", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Submission failed");
        if (data.code === "duplicate_tx_hash") {
          setFormErrors((p) => ({ ...p, transactionHash: "This transaction hash was already submitted" }));
        }
        return;
      }
      setStep("done");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
              {settingsError || "Manual crypto payments are not configured yet. Please use card checkout or contact support."}
            </p>
            <Link href="/#pricing" className="crypto-pay__done-link inline-block mt-6">
              Back to pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crypto-pay bg-noise">
      <img
        src="/assets/hanoinfrontend/bird-mascot.jpg"
        alt=""
        className="crypto-pay__bg"
      />
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
          <span>Secure crypto checkout</span>
        </div>

        <h1 className="crypto-pay__title">Pay with crypto</h1>
        <p className="crypto-pay__subtitle">
          Send your payment, then submit proof for manual verification. Access is granted only after our team approves your transaction.
        </p>

        <div className="crypto-pay__plan">
          <p className="crypto-pay__plan-label">Your selected plan</p>
          <p className="crypto-pay__plan-name">{selectedPlan.name}</p>
          <p className="crypto-pay__plan-meta">
            {selectedPlan.priceLabel} · send exactly <strong>${selectedPlan.amountUsd.toFixed(2)}</strong> USD equivalent
          </p>
        </div>

        <ol className="crypto-pay__steps" aria-label="Checkout progress">
          {(["pay", "proof", "done"] as Step[]).map((s, i) => (
            <li key={s} className={stepClass(step, s, i)}>
              <span className="crypto-pay__step-dot">
                {step === "done" && s !== "done" ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="crypto-pay__step-label">{STEP_LABELS[i]}</span>
            </li>
          ))}
        </ol>

        {step === "pay" && (
          <div className="crypto-pay__space">
            <section className="crypto-pay__card">
              <p className="crypto-pay__section-label">Payment network</p>
              <div className="crypto-pay__networks">
                {settings.paymentOptions.map((opt) => {
                  const active =
                    selectedOption?.currency === opt.currency &&
                    selectedOption?.network === opt.network;
                  return (
                    <button
                      key={`${opt.currency}-${opt.network}`}
                      type="button"
                      onClick={() => setSelectedOption(opt)}
                      className={`crypto-pay__network${active ? " crypto-pay__network--active" : ""}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {selectedOption && (
                <>
                  <div className="crypto-pay__alert">
                    <p>
                      Send the <strong>exact amount</strong> of <strong>${selectedPlan.amountUsd.toFixed(2)}</strong> in{" "}
                      {selectedOption.currency} on the <strong>{selectedOption.network}</strong> network only.
                    </p>
                    <p>
                      Using the wrong network may result in <strong>permanent loss of funds</strong>. Double-check before sending.
                    </p>
                  </div>

                  <div className="crypto-pay__pay-grid">
                    <div className="crypto-pay__qr">
                      <img
                        src={qrUrl(selectedOption.walletAddress)}
                        alt="Wallet QR code"
                        width={200}
                        height={200}
                      />
                    </div>
                    <div className="crypto-pay__wallet-block">
                      <p className="crypto-pay__field-label">Receiving wallet</p>
                      <div className="crypto-pay__wallet-row">
                        <code className="crypto-pay__wallet-code">{selectedOption.walletAddress}</code>
                        <button
                          type="button"
                          onClick={copyAddress}
                          className="crypto-pay__copy"
                          aria-label="Copy wallet address"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="crypto-pay__meta-grid">
                        <div className="crypto-pay__meta-cell">
                          <span>Currency</span>
                          <strong>{selectedOption.currency}</strong>
                        </div>
                        <div className="crypto-pay__meta-cell">
                          <span>Network</span>
                          <strong>{selectedOption.network}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ol className="crypto-pay__instructions">
                    <li>Copy the wallet address or scan the QR code.</li>
                    <li>
                      Send exactly <strong>${selectedPlan.amountUsd.toFixed(2)}</strong> in {selectedOption.currency} via{" "}
                      {selectedOption.network}.
                    </li>
                    <li>Save your transaction hash for the next step.</li>
                    <li>Submit proof for review — typically within {settings.verificationHours} hours.</li>
                  </ol>
                </>
              )}
            </section>

            <div className="crypto-pay__footer">
              <p className="crypto-pay__support">
                <ShieldCheck className="h-3.5 w-3.5" />
                Support: {settings.supportEmail}
              </p>
              <button
                type="button"
                onClick={() => setStep("proof")}
                disabled={!selectedOption}
                className="crypto-pay__btn-primary"
              >
                <Wallet className="h-4 w-4" /> I&apos;ve sent the payment
              </button>
            </div>
          </div>
        )}

        {step === "proof" && selectedOption && (
          <form onSubmit={handleSubmitProof} className="crypto-pay__card crypto-pay__space">
            <div>
              <h2 className="crypto-pay__form-title">Submit payment proof</h2>
              <p className="crypto-pay__form-meta">
                {selectedPlan.name} · ${selectedPlan.amountUsd.toFixed(2)} · {selectedOption.currency} ({selectedOption.network})
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
                {formErrors.fullName && <p className="crypto-pay__field-error">{formErrors.fullName}</p>}
              </div>
              <div className="crypto-pay__field">
                <label className="crypto-pay__field-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="crypto-pay__input"
                  placeholder="you@example.com"
                />
                {formErrors.email && <p className="crypto-pay__field-error">{formErrors.email}</p>}
              </div>
            </div>

            <div className="crypto-pay__grid-2">
              <div className="crypto-pay__field">
                <label className="crypto-pay__field-label">Amount paid (USD)</label>
                <input
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="crypto-pay__input"
                  inputMode="decimal"
                />
                {formErrors.amountPaid && <p className="crypto-pay__field-error">{formErrors.amountPaid}</p>}
              </div>
              <div className="crypto-pay__field">
                <label className="crypto-pay__field-label">Currency / network</label>
                <input
                  readOnly
                  value={`${selectedOption.currency} · ${selectedOption.network}`}
                  className="crypto-pay__input crypto-pay__input--readonly"
                />
              </div>
            </div>

            <div className="crypto-pay__field">
              <label className="crypto-pay__field-label">Transaction hash</label>
              <input
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                className="crypto-pay__input crypto-pay__input--mono"
                placeholder="Paste your transaction hash"
              />
              {formErrors.transactionHash && <p className="crypto-pay__field-error">{formErrors.transactionHash}</p>}
            </div>

            <div className="crypto-pay__field">
              <label className="crypto-pay__field-label">Sender wallet</label>
              <input
                value={senderWallet}
                onChange={(e) => setSenderWallet(e.target.value)}
                className="crypto-pay__input crypto-pay__input--mono"
                placeholder="Your sending wallet address"
              />
              {formErrors.senderWallet && <p className="crypto-pay__field-error">{formErrors.senderWallet}</p>}
            </div>

            <div className="crypto-pay__field">
              <label className="crypto-pay__field-label">Screenshot (optional)</label>
              <label className="crypto-pay__upload">
                <Upload className="h-5 w-5 shrink-0 text-[var(--accent-soft)]" />
                <span className="crypto-pay__upload-text">
                  {proofFileName ? proofFileName : "JPG, PNG, or WebP — max 5 MB"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f) {
                      setProofFile(f);
                      setProofFileName(f.name);
                    }
                  }}
                />
              </label>
            </div>

            <div className="crypto-pay__field">
              <label className="crypto-pay__field-label">Notes (optional)</label>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows={3}
                className="crypto-pay__input resize-none"
                placeholder="Anything else we should know?"
              />
            </div>

            <div className="crypto-pay__form-actions">
              <button type="button" onClick={() => setStep("pay")} className="crypto-pay__btn-secondary">
                Back
              </button>
              <button type="submit" disabled={submitting} className="crypto-pay__btn-primary">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit payment proof"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="crypto-pay__card crypto-pay__done">
            <CheckCircle2 className="crypto-pay__done-icon" />
            <h2>Proof received</h2>
            <p>
              Your submission is <strong className="text-foreground">pending manual review</strong>. We&apos;ll email you at{" "}
              <strong className="text-foreground">{email}</strong> once approved — typically within {settings.verificationHours} hours.
            </p>
            <Link href="/" className="crypto-pay__done-link">
              Return to homepage
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
