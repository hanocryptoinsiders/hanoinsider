import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CryptoPaymentClient } from "@/components/crypto/CryptoPaymentClient";

export const metadata = {
  title: "Pay with Crypto | Hano Insiders",
  description: "Manual crypto payment with admin verification",
};

export default function CryptoPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="crypto-pay__loading">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CryptoPaymentClient />
    </Suspense>
  );
}
