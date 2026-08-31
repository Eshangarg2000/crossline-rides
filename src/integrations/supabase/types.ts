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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          driver_payout: number
          dropoff_request: string | null
          estimated_detour_min: number | null
          hold_expires_at: string | null
          id: string
          payment_environment: string
          payment_status: string
          payout_at: string | null
          payout_reference: string | null
          payout_status: string
          pickup_point: Json | null
          pickup_request: string | null
          refund_amount: number
          ride_id: string
          rider_id: string
          seats: number
          seats_released_at: string | null
          service_fee: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          driver_payout?: number
          dropoff_request?: string | null
          estimated_detour_min?: number | null
          hold_expires_at?: string | null
          id?: string
          payment_environment?: string
          payment_status?: string
          payout_at?: string | null
          payout_reference?: string | null
          payout_status?: string
          pickup_point?: Json | null
          pickup_request?: string | null
          refund_amount?: number
          ride_id: string
          rider_id: string
          seats?: number
          seats_released_at?: string | null
          service_fee?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tax_amount?: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          driver_payout?: number
          dropoff_request?: string | null
          estimated_detour_min?: number | null
          hold_expires_at?: string | null
          id?: string
          payment_environment?: string
          payment_status?: string
          payout_at?: string | null
          payout_reference?: string | null
          payout_status?: string
          pickup_point?: Json | null
          pickup_request?: string | null
          refund_amount?: number
          ride_id?: string
          rider_id?: string
          seats?: number
          seats_released_at?: string | null
          service_fee?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tax_amount?: number
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
          decision_reason: string | null
          decision_source: string
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
          reviewed_by: string | null
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
          decision_reason?: string | null
          decision_source?: string
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
          reviewed_by?: string | null
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
          decision_reason?: string | null
          decision_source?: string
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
          reviewed_by?: string | null
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
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
          cancellation_reason: string | null
          cancelled_at: string | null
          car: string | null
          completed_at: string | null
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
          max_detour_min: number
          notes: string | null
          origin: string
          origin_lat: number | null
          origin_lng: number | null
          origin_place_id: string | null
          pickup_flexibility: string
          price_per_seat: number
          recurrence: Json | null
          ride_kind: string
          route_polyline: string | null
          seats_available: number
          seats_total: number
          status: string
          stops: string[]
          updated_at: string
        }
        Insert: {
          arrive_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          car?: string | null
          completed_at?: string | null
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
          max_detour_min?: number
          notes?: string | null
          origin: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_place_id?: string | null
          pickup_flexibility?: string
          price_per_seat: number
          recurrence?: Json | null
          ride_kind?: string
          route_polyline?: string | null
          seats_available?: number
          seats_total?: number
          status?: string
          stops?: string[]
          updated_at?: string
        }
        Update: {
          arrive_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          car?: string | null
          completed_at?: string | null
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
          max_detour_min?: number
          notes?: string | null
          origin?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_place_id?: string | null
          pickup_flexibility?: string
          price_per_seat?: number
          recurrence?: Json | null
          ride_kind?: string
          route_polyline?: string | null
          seats_available?: number
          seats_total?: number
          status?: string
          stops?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          environment: string
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          environment: string
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          environment?: string
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_booking_atomic: {
        Args: {
          _actor: string
          _booking_id: string
          _by_driver?: boolean
          _reason: string
          _refund: number
        }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          driver_payout: number
          dropoff_request: string | null
          estimated_detour_min: number | null
          hold_expires_at: string | null
          id: string
          payment_environment: string
          payment_status: string
          payout_at: string | null
          payout_reference: string | null
          payout_status: string
          pickup_point: Json | null
          pickup_request: string | null
          refund_amount: number
          ride_id: string
          rider_id: string
          seats: number
          seats_released_at: string | null
          service_fee: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_ride_atomic: {
        Args: { _actor: string; _reason: string; _ride_id: string }
        Returns: undefined
      }
      complete_due_rides: { Args: never; Returns: number }
      confirm_booking_paid: {
        Args: {
          _booking_id: string
          _environment: string
          _payment_intent: string
          _tax: number
          _total: number
        }
        Returns: boolean
      }
      create_booking_hold: {
        Args: {
          _environment: string
          _hold_minutes?: number
          _ride_id: string
          _seats: number
        }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          driver_payout: number
          dropoff_request: string | null
          estimated_detour_min: number | null
          hold_expires_at: string | null
          id: string
          payment_environment: string
          payment_status: string
          payout_at: string | null
          payout_reference: string | null
          payout_status: string
          pickup_point: Json | null
          pickup_request: string | null
          refund_amount: number
          ride_id: string
          rider_id: string
          seats: number
          seats_released_at: string | null
          service_fee: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_stale_holds: { Args: { _ride_id?: string }; Returns: number }
      fail_booking: {
        Args: {
          _booking_id: string
          _environment: string
          _payment_status: string
          _reason: string
        }
        Returns: boolean
      }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_driver: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _actor: string
          _entity_id: string
          _entity_type: string
          _metadata?: Json
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body: string
          _entity_id: string
          _entity_type: string
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
      run_lifecycle_sweep: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "user"
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
      app_role: ["admin", "reviewer", "user"],
      driver_app_status: ["draft", "submitted", "approved", "rejected"],
    },
  },
} as const
