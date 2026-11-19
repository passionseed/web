"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadWallet } from "@/app/shift/island/wallet-actions";
import type { WalletDetail } from "@/lib/supabase/shift-quests/playerTypes";

import { WALLET } from "./copy";

export type WalletState = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: WalletDetail };

/**
 * The wallet, read when a sheet that shows it opens (and again after a
 * redeem or a cancel), never with the page. A newer read drops an older
 * answer, and nothing lands after unmount. While a read runs, the last
 * answer stays. The wallet sheet and the shop sheet each keep their own.
 */
export function useWallet(open: boolean): { state: WalletState; reload: () => void } {
  const [state, setState] = useState<WalletState>({ status: "loading" });
  const round = useRef(0);
  const reload = useCallback(() => {
    const mine = ++round.current;
    loadWallet().then(
      (result) => {
        if (mine !== round.current) return;
        setState(result.ok ? { status: "ready", data: result.data } : { status: "error", error: result.error });
      },
      () => {
        if (mine === round.current) setState({ status: "error", error: WALLET.error });
      },
    );
  }, []);
  useEffect(() => {
    if (open) reload();
  }, [open, reload]);
  useEffect(
    () => () => {
      round.current++;
    },
    [],
  );
  return { state, reload };
}
