"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ErrorBox, smallBtn } from "../../../ui";
import { verifyPayment } from "../actions";
import type { FormState } from "@/lib/presentations/form";

const initial: FormState = {};
const KROK_MS = 3000;
const MAX_POKUSU = 10; // ~30 sekund

/**
 * Čekárna po návratu z platby.
 *
 * Sama od sebe NIC neodemyká — jen se každé 3 vteřiny znovu podívá do databáze,
 * jestli už dorazil webhook a prezentace se zveřejnila. Kdyby webhook nedorazil,
 * je tu tlačítko „Ověřit platbu", které se serverově zeptá přímo Stripu.
 */
export function Waiting({ presentationId }: { presentationId: string }) {
  const router = useRouter();
  const [pokus, setPokus] = useState(0);
  const [state, formAction] = useActionState(verifyPayment, initial);

  useEffect(() => {
    if (pokus >= MAX_POKUSU) return;
    const t = setTimeout(() => {
      setPokus((n) => n + 1);
      router.refresh(); // znovu načte serverovou stránku → přečte aktuální stav
    }, KROK_MS);
    return () => clearTimeout(t);
  }, [pokus, router]);

  const vyprselo = pokus >= MAX_POKUSU;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <strong style={{ fontSize: "1.1rem" }}>
          {vyprselo ? "Platba se pořád zpracovává" : "Platba se zpracovává…"}
        </strong>
        <p style={{ color: "var(--muted)" }}>
          {vyprselo
            ? 'Trvá to déle než obvykle. Klikni na „Ověřit platbu" — zeptáme se Stripu přímo.'
            : "Čekáme na potvrzení od Stripu. Zveřejníme, jakmile dorazí (obvykle pár vteřin). Stránku nemusíš obnovovat."}
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
          Pokud jsi platbu dokončil(a), peníze jsou v pořádku — zveřejnění proběhne
          i kdybys teď odešel(a) pryč.
        </p>
      </div>

      {state.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <form action={formAction}>
        <input type="hidden" name="id" value={presentationId} />
        <VerifyButton />
      </form>
    </div>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ ...smallBtn, opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "Ověřuji u Stripu…" : "Ověřit platbu"}
    </button>
  );
}
