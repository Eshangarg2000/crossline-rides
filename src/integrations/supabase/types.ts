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
      bookings: {
        Row: {
          created_at: string
          driver_payout: number
          id: string
          payment_environment: string
          payment_status: string
          ride_id: string
          rider_id: string
          seats: number
          service_fee: number
          status: string
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_payout?: number
          id?: string
          payment_environment?: string
          payment_status?: string
          ride_id: string
          rider_id: string
          seats?: number
          service_fee?: number
          status?: string
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_payout?: number
          id?: string
          payment_environment?: string
          payment_status?: string
          ride_id?: string
          rider_id?: string
          seats?: number
          service_fee?: number
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_applications: {
        Row: {
          abstract_path: string | null
          city: string | null
          consent_accurate: boolean
          consent_background_check: boolean
          consent_terms: boolean
          created_at: string
          date_of_birth: string | null
          id: string
          insurance_company: string | null
          insurance_expiry: string | null
          insurance_path: string | null
          insurance_policy_number: string | null
          legal_name: string | null
          licence_back_path: string | null
          licence_class: string | null
          licence_expiry: string | null
          licence_front_path: string | null
          licence_number: string | null
          licence_province: string | null
          phone: string | null
          plate_number: string | null
          plate_province: string | null
          postal_code: string | null
          province: string | null
          registration_path: string | null
          review_notes: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["driver_app_status"]
          street_address: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          vehicle_colour: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
        }
        Insert: {
          abstract_path?: string | null
          city?: string | null
          consent_accurate?: boolean
          consent_background_check?: boolean
          consent_terms?: boolean
          created_at?: string
          date_of_birth?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_path?: string | null
          insurance_policy_number?: string | null
          legal_name?: string | null
          licence_back_path?: string | null
          licence_class?: string | null
          licence_expiry?: string | null
          licence_front_path?: string | null
          licence_number?: string | null
          licence_province?: string | null
          phone?: string | null
          plate_number?: string | null
          plate_province?: string | null
          postal_code?: string | null
          province?: string | null
          registration_path?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["driver_app_status"]
          street_address?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          vehicle_colour?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Update: {
          abstract_path?: string | null
          city?: string | null
          consent_accurate?: boolean
          consent_background_check?: boolean
          consent_terms?: boolean
          created_at?: string
          date_of_birth?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_path?: string | null
          insurance_policy_number?: string | null
          legal_name?: string | null
          licence_back_path?: string | null
          licence_class?: string | null
          licence_expiry?: string | null
          licence_front_path?: string | null
          licence_number?: string | null
          licence_province?: string | null
          phone?: string | null
          plate_number?: string | null
          plate_province?: string | null
          postal_code?: string | null
          province?: string | null
          registration_path?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["driver_app_status"]
          street_address?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          vehicle_colour?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          rating: number
          trips_count: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          rating?: number
          trips_count?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          rating?: number
          trips_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          arrive_at: string | null
          car: string | null
          created_at: string
          depart_at: string
          destination: string
          destination_lat: number | null
          destination_lng: number | null
          destination_place_id: string | null
          distance_km: number | null
          driver_id: string
          duration_min: number | null
          id: string
          notes: string | null
          origin: string
          origin_lat: number | null
          origin_lng: number | null
          origin_place_id: string | null
          price_per_seat: number
          route_polyline: string | null
          seats_available: number
          seats_total: number
          status: string
          stops: string[]
          updated_at: string
        }
        Insert: {
          arrive_at?: string | null
          car?: string | null
          created_at?: string
          depart_at: string
          destination: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_place_id?: string | null
          distance_km?: number | null
          driver_id: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          origin: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_place_id?: string | null
          price_per_seat: number
          route_polyline?: string | null
          seats_available?: number
          seats_total?: number
          status?: string
          stops?: string[]
          updated_at?: string
        }
        Update: {
          arrive_at?: string | null
          car?: string | null
          created_at?: string
          depart_at?: string
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_place_id?: string | null
          distance_km?: number | null
          driver_id?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          origin?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_place_id?: string | null
          price_per_seat?: number
          route_polyline?: string | null
          seats_available?: number
          seats_total?: number
          status?: string
          stops?: string[]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_driver_profiles: {
        Args: { ids: string[] }
        Returns: {
          avatar_url: string
          city: string
          full_name: string
          id: string
          rating: number
          trips_count: number
        }[]
      }
    }
    Enums: {
      driver_app_status: "draft" | "submitted" | "approved" | "rejected"
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
      driver_app_status: ["draft", "submitted", "approved", "rejected"],
    },
  },
} as const
