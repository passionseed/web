import { CheckCircle2, CircleDashed } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentCurrency, RecordedPayment, RecordedPaymentSummary } from "@/lib/supabase/ceo-dashboard";

/*
 * Server-rendered pieces for /admin/ceo/payments. Theme tokens only, so they
 * sit inside the Dusk admin shell without their own backgrounds.
 */

const SYMBOL: Record<PaymentCurrency, string> = { THB: "฿", USD: "$" };

export function formatMoney(amount: number, currency: PaymentCurrency): string {
  return `${SYMBOL[currency]}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatTotals(totals: Record<PaymentCurrency, number>): string {
  const parts = [formatMoney(totals.THB, "THB")];
  if (totals.USD > 0) parts.push(formatMoney(totals.USD, "USD"));
  return parts.join(" + ");
}

const METHOD_LABELS: Record<string, string> = {
  family_round: "Family round",
  camp: "Camp",
  bank_transfer: "Bank transfer",
  promptpay: "PromptPay",
  credit_card: "Credit card",
};

export function RecordedRevenueCard({ summary }: { summary: RecordedPaymentSummary }) {
  const stats = [
    { label: "Last 30 days", value: formatTotals(summary.last30), note: `${summary.count30} payments` },
    { label: "Previous 30 days", value: formatTotals(summary.previous30) },
    { label: "All time", value: formatTotals(summary.allTime), note: `${summary.countAll} payments` },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recorded revenue</CardTitle>
        <CardDescription>Sums of the payments entered on this page. Not recurring revenue.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="py-3 sm:px-4 sm:py-0 sm:first:pl-0">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</dd>
              {stat.note && <dd className="text-xs text-muted-foreground">{stat.note}</dd>}
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function RecentPaymentsCard({ payments }: { payments: RecordedPayment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latest entries</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {payments.map((payment, i) => (
              <li key={`${payment.at}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{payment.productName ?? "Payment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.at).toLocaleDateString("en-GB", {
                      timeZone: "Asia/Bangkok",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {payment.paymentMethod ? `, ${METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums">{formatMoney(payment.amount, payment.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const INTEGRATIONS = [
  { name: "Manual entry", connected: true },
  { name: "Stripe", connected: false },
  { name: "Omise (Thailand)", connected: false },
];

export function PaymentIntegrationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment sources</CardTitle>
        <CardDescription>Only manual entry feeds these totals today.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {INTEGRATIONS.map((integration) => (
            <li key={integration.name} className="flex items-center justify-between">
              <span>{integration.name}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {integration.connected ? (
                  <CheckCircle2 className="h-4 w-4 text-foreground" aria-hidden="true" />
                ) : (
                  <CircleDashed className="h-4 w-4" aria-hidden="true" />
                )}
                {integration.connected ? "Active" : "Not connected"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
