"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, ExternalLink } from "lucide-react";
import {
  completeReferralRewardAction,
  cancelReferralRewardAction,
  updateReferralRewardNotesAction,
} from "./actions";

export type AdminRewardRow = {
  id: string;
  conversion_id: string;
  reward_type: "referrer" | "referred";
  amount: number;
  currency: string;
  network: string;
  wallet_address: string | null;
  status: string;
  transaction_hash: string | null;
  admin_notes: string | null;
  completed_at: string | null;
  created_at: string;
  recipient_name: string | null;
  recipient_email: string | null;
  referrer_name: string | null;
  referrer_email: string | null;
  referred_name: string | null;
  referred_email: string | null;
  referral_code: string;
  selected_plan: string | null;
  package_amount_paid: number;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_status: string;
  registration_status: string;
};

export default function AdminReferralsClient({ rewards }: { rewards: AdminRewardRow[] }) {
  const [pending, startTransition] = useTransition();
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const handleComplete = (rewardId: string) => {
    startTransition(async () => {
      try {
        await completeReferralRewardAction(rewardId, {
          transactionHash: txInputs[rewardId] || "",
          adminNotes: noteInputs[rewardId] || "",
        });
        toast.success("Reward marked completed — confirmation email sent");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to complete reward");
      }
    });
  };

  const handleCancel = (rewardId: string) => {
    startTransition(async () => {
      try {
        await cancelReferralRewardAction(rewardId, noteInputs[rewardId]);
        toast.success("Reward cancelled");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to cancel reward");
      }
    });
  };

  const handleSaveNotes = (rewardId: string) => {
    startTransition(async () => {
      try {
        await updateReferralRewardNotesAction(rewardId, noteInputs[rewardId] || "");
        toast.success("Notes saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save notes");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          Referral rewards ({rewards.length})
        </p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Referrer earns $15 USDC on Base. Referred member earns 20% of the package amount paid.
          Pay manually, enter the transaction hash, then mark completed to send the confirmation email.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[1200px]">
          <thead>
            <tr className="text-muted-foreground uppercase tracking-wider text-[9px] border-b border-border">
              <th className="p-3">Referrer</th>
              <th className="p-3">Referred</th>
              <th className="p-3">Code</th>
              <th className="p-3">Plan / Paid</th>
              <th className="p-3">Reward</th>
              <th className="p-3">Recipient</th>
              <th className="p-3">Wallet</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Registration</th>
              <th className="p-3">Tx hash</th>
              <th className="p-3">Notes</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rewards.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-muted-foreground">
                  No referral rewards yet. They are created after a referred user pays and registers.
                </td>
              </tr>
            ) : (
              rewards.map((r) => (
                <tr key={r.id} className="border-b border-border/40 align-top">
                  <td className="p-3">
                    <div className="font-semibold">{r.referrer_name || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{r.referrer_email}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{r.referred_name || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{r.referred_email}</div>
                  </td>
                  <td className="p-3 font-mono">{r.referral_code}</td>
                  <td className="p-3">
                    <div>{r.selected_plan || "—"}</div>
                    <div className="text-success">${r.package_amount_paid.toFixed(2)}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold capitalize">{r.reward_type}</div>
                    <div>${r.amount.toFixed(2)} {r.currency}</div>
                    <div className="text-[10px] text-muted-foreground">{r.network}</div>
                    <span
                      className={`inline-block mt-1 text-[9px] uppercase px-1.5 py-0.5 rounded ${
                        r.status === "completed"
                          ? "bg-success/10 text-success"
                          : r.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div>{r.recipient_name || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{r.recipient_email}</div>
                  </td>
                  <td className="p-3 font-mono text-[10px] max-w-[120px] truncate" title={r.wallet_address || ""}>
                    {r.wallet_address || "—"}
                  </td>
                  <td className="p-3">
                    <div>{r.payment_provider || "—"}</div>
                    <div className="text-[10px]">{r.payment_status}</div>
                    {r.payment_reference && (
                      <div className="text-[10px] font-mono truncate max-w-[100px]" title={r.payment_reference}>
                        {r.payment_reference.slice(0, 12)}…
                      </div>
                    )}
                  </td>
                  <td className="p-3">{r.registration_status}</td>
                  <td className="p-3">
                    {r.status === "completed" && r.transaction_hash ? (
                      <span className="font-mono text-[10px] text-sky-400 flex items-center gap-1">
                        {r.transaction_hash.slice(0, 10)}…
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    ) : (
                      <input
                        type="text"
                        placeholder="0x…"
                        value={txInputs[r.id] ?? r.transaction_hash ?? ""}
                        onChange={(e) => setTxInputs((p) => ({ ...p, [r.id]: e.target.value }))}
                        disabled={r.status !== "pending" || pending}
                        className="w-full rounded border border-border bg-secondary/20 px-2 py-1 text-[10px] font-mono"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    <textarea
                      rows={2}
                      value={noteInputs[r.id] ?? r.admin_notes ?? ""}
                      onChange={(e) => setNoteInputs((p) => ({ ...p, [r.id]: e.target.value }))}
                      disabled={pending}
                      className="w-full min-w-[100px] rounded border border-border bg-secondary/20 px-2 py-1 text-[10px]"
                    />
                    {r.status === "pending" && (
                      <button
                        onClick={() => handleSaveNotes(r.id)}
                        disabled={pending}
                        className="mt-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Save notes
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && (
                      <div className="flex flex-col gap-1 items-end">
                        <button
                          onClick={() => handleComplete(r.id)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 rounded bg-success/20 text-success px-2 py-1 text-[10px] font-semibold hover:bg-success/30 disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" /> Mark paid
                        </button>
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 rounded bg-destructive/10 text-destructive px-2 py-1 text-[10px] hover:bg-destructive/20 disabled:opacity-50"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
