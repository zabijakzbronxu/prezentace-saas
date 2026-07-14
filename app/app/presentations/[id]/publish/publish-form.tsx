"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ErrorBox, primaryBtn } from "../../ui";
import { startCheckout } from "./actions";
import type { FormState } from "@/lib/presentations/form";

const initial: FormState = {};

/**
 * Tlačítko „Zveřejnit" → platební stránka Stripu.
 * Tlačítko se po kliknutí samo vypne (první obrana proti dvojkliku).
 * Druhá, spolehlivější obrana je v databázi (jedna rozdělaná platba na prezentaci).
 */
export function PublishForm({
  presentationId,
  priceLabel,
}: {
  presentationId: string;
  priceLabel: string;
}) {
  const [state, formAction] = useActionState(startCheckout, initial);

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <input type="hidden" name="id" value={presentationId} />
      {state.error ? <ErrorBox>{state.error}</ErrorBox> : null}
      <SubmitButton priceLabel={priceLabel} />
    </form>
  );
}

function SubmitButton({ priceLabel }: { priceLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        ...primaryBtn,
        opacity: pending ? 0.6 : 1,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending ? "Otevírám platbu…" : `Zveřejnit a zaplatit ${priceLabel}`}
    </button>
  );
}
