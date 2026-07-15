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
          // Otínská — pole nemovitosti (migrace 20260715120000_otinska_sections.sql)
          subtitle: string | null;
          year_built: number | null;
          floors: number | null;
          built_area_m2: number | null;
          building_dimensions: string | null;
          condition: string | null;
          ownership: string | null;
          monthly_costs_czk: number | null;
          lat: number | null;
          lng: number | null;
          target_persona: Json | null;
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
          subtitle?: string | null;
          year_built?: number | null;
          floors?: number | null;
          built_area_m2?: number | null;
          building_dimensions?: string | null;
          condition?: string | null;
          ownership?: string | null;
          monthly_costs_czk?: number | null;
          lat?: number | null;
          lng?: number | null;
          target_persona?: Json | null;
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
          // Otínská (migrace 20260715120000_otinska_sections.sql)
          caption: string | null;
          category: string | null;
          room_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          storage_path: string;
          is_hero?: boolean;
          sort_order?: number;
          alt_text?: string | null;
          caption?: string | null;
          category?: string | null;
          room_id?: string | null;
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
      // ===== Otínská — stavebnice sekcí (20260715120000) =====
      presentation_sections: {
        Row: {
          id: string;
          presentation_id: string;
          kind: string; // viz SectionKind v lib/presentations/sections.ts
          position: number;
          enabled: boolean;
          content: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          kind: string;
          position?: number;
          enabled?: boolean;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_sections"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "presentation_sections_presentation_id_fkey";
            columns: ["presentation_id"];
            referencedRelation: "presentations";
            referencedColumns: ["id"];
          },
        ];
      };
      presentation_documents: {
        Row: {
          id: string;
          presentation_id: string;
          name: string;
          category: string | null;
          description: string | null;
          storage_path: string;
          file_type: string | null;
          file_size_bytes: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          name: string;
          category?: string | null;
          description?: string | null;
          storage_path: string;
          file_type?: string | null;
          file_size_bytes?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_documents"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "presentation_documents_presentation_id_fkey";
            columns: ["presentation_id"];
            referencedRelation: "presentations";
            referencedColumns: ["id"];
          },
        ];
      };
      // ===== Codex 2026-07-15 — registrace obrázků médií (H3/H4) =====
      presentation_media: {
        Row: {
          id: string;
          presentation_id: string;
          section_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          section_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_media"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "presentation_media_presentation_id_fkey";
            columns: ["presentation_id"];
            referencedRelation: "presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presentation_media_section_id_fkey";
            columns: ["section_id"];
            referencedRelation: "presentation_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      // ===== Otínská — model připravený pro další kola (zatím bez renderu) =====
      presentation_floors: {
        Row: {
          id: string;
          presentation_id: string;
          label: string;
          floorplan_path: string | null;
          plan_data: Json | null;
          scale: Json | null;
          image_view: Json | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          label: string;
          floorplan_path?: string | null;
          plan_data?: Json | null;
          scale?: Json | null;
          image_view?: Json | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_floors"]["Insert"]
        >;
        Relationships: [];
      };
      presentation_rooms: {
        Row: {
          id: string;
          floor_id: string;
          name: string;
          area_m2: number | null;
          color: string | null;
          polygon: Json;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          floor_id: string;
          name: string;
          area_m2?: number | null;
          color?: string | null;
          polygon?: Json;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_rooms"]["Insert"]
        >;
        Relationships: [];
      };
      presentation_maps: {
        Row: {
          id: string;
          presentation_id: string;
          title: string | null;
          caption: string | null;
          storage_path: string | null;
          map_group: string | null;
          marker: Json | null;
          zoom: number | null;
          offset_xy: Json | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          title?: string | null;
          caption?: string | null;
          storage_path?: string | null;
          map_group?: string | null;
          marker?: Json | null;
          zoom?: number | null;
          offset_xy?: Json | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_maps"]["Insert"]
        >;
        Relationships: [];
      };
      presentation_places: {
        Row: {
          id: string;
          presentation_id: string;
          name: string;
          place_type: string | null;
          place_id: string | null;
          gps: Json | null;
          rating: number | null;
          review_count: number | null;
          image: string | null;
          distance: string | null;
          description: string | null;
          super_category: string | null;
          reviews: Json;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          name: string;
          place_type?: string | null;
          place_id?: string | null;
          gps?: Json | null;
          rating?: number | null;
          review_count?: number | null;
          image?: string | null;
          distance?: string | null;
          description?: string | null;
          super_category?: string | null;
          reviews?: Json;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_places"]["Insert"]
        >;
        Relationships: [];
      };
      presentation_panoramas: {
        Row: {
          id: string;
          presentation_id: string;
          storage_path: string | null;
          config: Json | null;
          hotspots: Json;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          presentation_id: string;
          storage_path?: string | null;
          config?: Json | null;
          hotspots?: Json;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["presentation_panoramas"]["Insert"]
        >;
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
      // ===== Otínská — sekce =====
      add_presentation_section: {
        Args: { p_presentation_id: string; p_kind: string };
        Returns: string;
      };
      move_presentation_section: {
        Args: { p_section_id: string; p_direction: string };
        Returns: null;
      };
      set_presentation_section_enabled: {
        Args: { p_section_id: string; p_enabled: boolean };
        Returns: null;
      };
      delete_presentation_section: {
        Args: { p_section_id: string };
        Returns: null;
      };
      reorder_presentation_sections: {
        Args: { p_presentation_id: string; p_ordered_ids: string[] };
        Returns: null;
      };
      // ===== Otínská — dokumenty =====
      register_presentation_document: {
        Args: {
          p_presentation_id: string;
          p_storage_path: string;
          p_name: string;
          p_category: string | null;
          p_description: string | null;
          p_file_type: string | null;
          p_file_size: number | null;
        };
        Returns: string;
      };
      delete_presentation_document: {
        Args: { p_document_id: string };
        Returns: string | null;
      };
      swap_document_order: {
        Args: { p_doc_a: string; p_doc_b: string };
        Returns: null;
      };
      // ===== Codex 2026-07-15 — registrace obrázků médií (H3/H4) =====
      sync_presentation_media: {
        Args: {
          p_presentation_id: string;
          p_section_id: string;
          p_paths: string[];
        };
        Returns: null;
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
export type PresentationSection =
  Database["public"]["Tables"]["presentation_sections"]["Row"];
export type PresentationDocument =
  Database["public"]["Tables"]["presentation_documents"]["Row"];
export type PresentationMedia =
  Database["public"]["Tables"]["presentation_media"]["Row"];
