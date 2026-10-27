"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUuid } from "@/lib/supabase/admin-list-params";

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const PAYMENT_METHODS = [
  { value: "family_round", label: "Family round" },
  { value: "camp", label: "Camp payment" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "promptpay", label: "PromptPay" },
  { value: "credit_card", label: "Credit card" },
];

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

/** Records a manual payment as a `payment_convert` funnel event. */
export function ManualPaymentTracker() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [paymentMethod, setPaymentMethod] = useState("family_round");
  const [productName, setProductName] = useState("Portfolio Review");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedUserId = userId.trim();
    if (!trimmedUserId || !amount.trim()) {
      toast.error("User ID and amount are required");
      return;
    }
    if (!isUuid(trimmedUserId)) {
      toast.error("User ID should be the account's UUID", {
        description: "Open the person in Users to copy their ID.",
      });
      return;
    }

    const amountNum = Number.parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/track-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: trimmedUserId,
          amount: amountNum,
          currency,
          payment_method: paymentMethod,
          product_name: productName,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Could not record the payment");
      }

      toast.success("Payment recorded", {
        description: `${currency === "THB" ? "฿" : "$"}${amountNum.toLocaleString("en-US")} for ${productName || "a payment"}`,
      });
      setUserId("");
      setAmount("");
      setNotes("");
      // Refresh the server-rendered totals next to the form.
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record a payment</CardTitle>
        <CardDescription>For payments made outside an online checkout.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="payment-user-id">
              User ID
              <RequiredMark />
            </Label>
            <Input
              id="payment-user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Account UUID"
              autoComplete="off"
              spellCheck={false}
              className="h-11 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">
                Amount
                <RequiredMark />
              </Label>
              <Input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-currency">Currency</Label>
              <select
                id="payment-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="THB">THB (฿)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment method</Label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={SELECT_CLASS}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-product">Product or service</Label>
            <Input
              id="payment-product"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Portfolio Review"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notes</Label>
            <Input
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional, for example the slip reference"
              className="h-11"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {isSubmitting ? "Recording" : "Record payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
