export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      boats: {
        Row: {
          capacity: number
          captain_id: string
          created_at: string
          description: string | null
          hero_image_url: string | null
          home_port: string | null
          id: string
          is_active: boolean
          length_ft: number | null
          make: string | null
          model: string | null
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          captain_id: string
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          home_port?: string | null
          id?: string
          is_active?: boolean
          length_ft?: number | null
          make?: string | null
          model?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          captain_id?: string
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          home_port?: string | null
          id?: string
          is_active?: boolean
          length_ft?: number | null
          make?: string | null
          model?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          boat_id: string | null
          captain_id: string
          created_at: string
          customer_id: string | null
          deposit_cents: number
          id: string
          notes: string | null
          party_size: number
          payout_cents: number
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          template_id: string | null
          total_cents: number
          trip_date: string
          updated_at: string
        }
        Insert: {
          boat_id?: string | null
          captain_id: string
          created_at?: string
          customer_id?: string | null
          deposit_cents?: number
          id?: string
          notes?: string | null
          party_size?: number
          payout_cents?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          template_id?: string | null
          total_cents?: number
          trip_date: string
          updated_at?: string
        }
        Update: {
          boat_id?: string | null
          captain_id?: string
          created_at?: string
          customer_id?: string | null
          deposit_cents?: number
          id?: string
          notes?: string | null
          party_size?: number
          payout_cents?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          template_id?: string | null
          total_cents?: number
          trip_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "trip_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["business_member_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["business_member_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["business_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          amenities_json: Json
          category_key: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          description: string | null
          email: string | null
          fishx_business_id: string | null
          hero_url: string | null
          hours_json: Json
          id: string
          is_published: boolean
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          phone: string | null
          premium_until: string | null
          region: string | null
          slug: string
          tagline: string | null
          updated_at: string
          verified_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          amenities_json?: Json
          category_key: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email?: string | null
          fishx_business_id?: string | null
          hero_url?: string | null
          hours_json?: Json
          id?: string
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          phone?: string | null
          premium_until?: string | null
          region?: string | null
          slug: string
          tagline?: string | null
          updated_at?: string
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          amenities_json?: Json
          category_key?: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email?: string | null
          fishx_business_id?: string | null
          hero_url?: string | null
          hours_json?: Json
          id?: string
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          premium_until?: string | null
          region?: string | null
          slug?: string
          tagline?: string | null
          updated_at?: string
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      customers: {
        Row: {
          captain_id: string
          created_at: string
          email: string | null
          fishx_user_id: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          email?: string | null
          fishx_user_id?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          email?: string | null
          fishx_user_id?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trip_templates: {
        Row: {
          base_price_cents: number
          boat_id: string | null
          captain_id: string
          created_at: string
          departure_location: string | null
          description: string | null
          duration_hours: number
          hero_image_url: string | null
          id: string
          includes: string[]
          is_published: boolean
          max_anglers: number
          slug: string | null
          target_species: string[]
          title: string
          updated_at: string
        }
        Insert: {
          base_price_cents?: number
          boat_id?: string | null
          captain_id: string
          created_at?: string
          departure_location?: string | null
          description?: string | null
          duration_hours?: number
          hero_image_url?: string | null
          id?: string
          includes?: string[]
          is_published?: boolean
          max_anglers?: number
          slug?: string | null
          target_species?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          base_price_cents?: number
          boat_id?: string | null
          captain_id?: string
          created_at?: string
          departure_location?: string | null
          description?: string | null
          duration_hours?: number
          hero_image_url?: string | null
          id?: string
          includes?: string[]
          is_published?: boolean
          max_anglers?: number
          slug?: string | null
          target_species?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_templates_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          business_id: string
          created_at: string
          decided_at: string | null
          doc_urls: string[]
          id: string
          notes: string | null
          reviewer_id: string | null
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          decided_at?: string | null
          doc_urls?: string[]
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          decided_at?: string | null
          doc_urls?: string[]
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: {
        Args: {
          _business_id: string
          _min_role?: Database["public"]["Enums"]["business_member_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "captain"
        | "admin"
        | "angler"
        | "business_owner"
        | "business_staff"
      booking_status:
        | "inquiry"
        | "pending_deposit"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      business_member_role: "owner" | "manager" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "captain",
        "admin",
        "angler",
        "business_owner",
        "business_staff",
      ],
      booking_status: [
        "inquiry",
        "pending_deposit",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      business_member_role: ["owner", "manager", "staff"],
    },
  },
} as const
