"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text, MAX } from "@/lib/presentations/form";

/**
 * Uloží profil uživatele (jméno a telefon). RLS pustí update jen na vlastní řádek.
 * Telefon validujeme stejně jako kontaktní telefon prezentace, ať platí jedna logika.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = text(formData, "full_name");
  const phone = text(formData, "phone");

  const back = (query: string): never => {
    redirect(`/account?${query}`);
  };

  if (full_name && full_name.length > MAX.contact_name) {
    back(`error=${encodeURIComponent(`Jméno je moc dlouhé (max ${MAX.contact_name} znaků).`)}`);
  }
  if (phone) {
    if (phone.length > MAX.contact_phone) {
      back(`error=${encodeURIComponent(`Telefon je moc dlouhý (max ${MAX.contact_phone} znaků).`)}`);
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6 || !/^[+]?[\d\s()/.-]+$/.test(phone)) {
      back(
        `error=${encodeURIComponent("Telefon nevypadá správně — použij číslice, případně mezery a +420.")}`,
      );
    }
  }

  // Profil zakládá trigger při registraci; upsert je pojistka pro starší účty
  // (backfill), aby uložení nespadlo na neexistujícím řádku.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name, phone });

  if (error) {
    console.error("[account] uložení profilu selhalo:", error.message);
    back(`error=${encodeURIComponent("Uložení se nepovedlo, zkus to prosím znovu.")}`);
  }

  revalidatePath("/account");
  back("saved=1");
}
