// Typy datového modelu (odpovídají migraci supabase/migrations/*_init_data_model.sql).
// Ruční, ale ve tvaru, který umí Supabase klient (Database generic).
// Až budeme mít Supabase CLI, dá se tenhle soubor generovat automaticky.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PresentationStatus = "draft" | "paid" | "published";
// `expired` = opuštěný / propadlý checkout (migrace 20260714120000_stripe_payments.sql)
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "expired";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      presentations: {
        Row: {
          id: string;
          owner_id: string;
          status: PresentationStatus;
          slug: string;
          title: string | null;
          property_type: string | null;
          street: string | null;
          city: string | null;
          postal_code: string | null;
          price_czk: number | null;
          disposition: string | null;
          floor_area_m2: number | null;
          land_area_m2: number | null;
          energy_class: string | null;
          description: string | null;
          location_text: string | null;
          features_text: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          status?: PresentationStatus;
          slug: string;
          title?: string | null;
          property_type?: string | null;
          street?: string | null;
          city?: string | null;
          postal_code?: string | null;
          price_czk?: number | null;
          disposition?: string | null;
          floor_area_m2?: number | null;
          land_area_m2?: number | null;
          energy_class?: string | null;
          description?: string | null;
          location_text?: string | null;
          features_text?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["presentations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "presentations_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      presentation_photos: {
        Row: {
          id: string;
          presentation_id: string;
          storage_path: string;
          is_hero: boolean;
          sort_order: number;
          alt_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          storage_path: string;
          is_hero?: boolean;
          sort_order?: number;
          alt_text?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_photos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "presentation_photos_presentation_id_fkey";
            columns: ["presentation_id"];
            referencedRelation: "presentations";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          presentation_id: string;
          amount_czk: number | null;
          currency: string;
          status: PaymentStatus;
          provider: string | null;
          provider_payment_id: string | null;
          paid_at: string | null;
          created_at: string;
          // Stripe (migrace 20260714120000_stripe_payments.sql)
          stripe_session_id: string | null;
          stripe_event_id: string | null;
          refund_event_id: string | null;
          refunded_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          amount_czk?: number | null;
          currency?: string;
          status?: PaymentStatus;
          provider?: string | null;
          provider_payment_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
          stripe_session_id?: string | null;
          stripe_event_id?: string | null;
          refund_event_id?: string | null;
          refunded_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payments_presentation_id_fkey";
            columns: ["presentation_id"];
            referencedRelation: "presentations";
            referencedColumns: ["id"];
          },
        ];
      };
      // Kniha zpracovaných událostí Stripu — jádro idempotence webhooku.
      // Píše/čte jen server (service_role); anon i authenticated mají REVOKE.
      stripe_events: {
        Row: {
          event_id: string;
          type: string;
          received_at: string;
          processed_at: string | null;
        };
        Insert: {
          event_id: string;
          type: string;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["stripe_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      register_presentation_photo: {
        Args: { p_presentation_id: string; p_storage_path: string };
        Returns: string;
      };
      swap_photo_order: {
        Args: { p_photo_a: string; p_photo_b: string };
        Returns: null;
      };
      set_hero_photo: {
        Args: { p_photo_id: string };
        Returns: null;
      };
      delete_presentation_photo: {
        Args: { p_photo_id: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Praktické zkratky pro použití v kódu:
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Presentation = Database["public"]["Tables"]["presentations"]["Row"];
export type PresentationPhoto =
  Database["public"]["Tables"]["presentation_photos"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type StripeEvent = Database["public"]["Tables"]["stripe_events"]["Row"];
