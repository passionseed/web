"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle, Loader2 } from "lucide-react";
import type { FormEvent } from "react";

export function ManualPaymentTracker() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [paymentMethod, setPaymentMethod] = useState("family_round");
  const [productName, setProductName] = useState("Portfolio Review");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!userId.trim() || !amount.trim()) {
      toast({
        title: "Missing required fields",
        description: "User ID and amount are required",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid amount",
        description: "Amount must be a positive number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/admin/track-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId.trim(),
          amount: amountNum,
          currency,
          payment_method: paymentMethod,
          product_name: productName,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to track payment");
      }

      await response.json();
      
      toast({
        title: "Payment tracked successfully",
        description: `Recorded ${currency === "THB" ? "฿" : "$"}${amountNum} payment`,
      });

      setUserId("");
      setAmount("");
      setNotes("");
      
    } catch (error) {
      console.error("Error tracking payment:", error);
      toast({
        title: "Failed to track payment",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="ei-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <DollarSign className="h-5 w-5 text-amber-400" />
          Manual Payment Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId" className="text-slate-300">
              User ID <span className="text-red-400">*</span>
            </Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user UUID"
              className="ei-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-300">
                Amount <span className="text-red-400">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="ei-input"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-slate-300">
                Currency
              </Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="ei-select"
              >
                <option value="THB">THB (฿)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-slate-300">
              Payment Method
            </Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="ei-select"
            >
              <option value="family_round">Family Round</option>
              <option value="camp">Camp Payment</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="promptpay">PromptPay</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName" className="text-slate-300">
              Product/Service
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Portfolio Review"
              className="ei-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-300">
              Notes
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this payment"
              className="ei-input"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full ei-button-dusk"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="border-white/10 text-slate-400 text-xs">
              Ready for Stripe integration
            </Badge>
            <Badge variant="outline" className="border-white/10 text-slate-400 text-xs">
              Ready for OMISE integration
            </Badge>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
