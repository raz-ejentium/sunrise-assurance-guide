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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          member_since: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          member_since: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          member_since?: string
          name?: string
        }
        Relationships: []
      }
      document_requirements: {
        Row: {
          documents: string[]
          id: string
          policy_type: string
          treatment_code: string
        }
        Insert: {
          documents: string[]
          id?: string
          policy_type: string
          treatment_code: string
        }
        Update: {
          documents?: string[]
          id?: string
          policy_type?: string
          treatment_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requirements_treatment_code_fkey"
            columns: ["treatment_code"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["treatment_code"]
          },
        ]
      }
      escalations: {
        Row: {
          conversation_summary: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          reason: string
          reason_code: string
          reference_number: string
          status: string
          what_could_not_be_determined: string | null
          what_was_determined: string | null
        }
        Insert: {
          conversation_summary: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          reason: string
          reason_code: string
          reference_number: string
          status?: string
          what_could_not_be_determined?: string | null
          what_was_determined?: string | null
        }
        Update: {
          conversation_summary?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          reason?: string
          reason_code?: string
          reference_number?: string
          status?: string
          what_could_not_be_determined?: string | null
          what_was_determined?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          annual_limit: number
          created_at: string
          currency: string
          customer_id: string
          effective_date: string
          id: string
          insurer_name: string
          policy_type: string
          status: string
        }
        Insert: {
          annual_limit: number
          created_at?: string
          currency?: string
          customer_id: string
          effective_date: string
          id: string
          insurer_name: string
          policy_type: string
          status: string
        }
        Update: {
          annual_limit?: number
          created_at?: string
          currency?: string
          customer_id?: string
          effective_date?: string
          id?: string
          insurer_name?: string
          policy_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_coverage: {
        Row: {
          covered: boolean
          exclusion_note: string | null
          id: string
          policy_id: string
          pre_auth_required: boolean
          requires_rider: boolean
          rider_held: boolean | null
          treatment_code: string
          waiting_period_months: number
        }
        Insert: {
          covered: boolean
          exclusion_note?: string | null
          id?: string
          policy_id: string
          pre_auth_required?: boolean
          requires_rider?: boolean
          rider_held?: boolean | null
          treatment_code: string
          waiting_period_months?: number
        }
        Update: {
          covered?: boolean
          exclusion_note?: string | null
          id?: string
          policy_id?: string
          pre_auth_required?: boolean
          requires_rider?: boolean
          rider_held?: boolean | null
          treatment_code?: string
          waiting_period_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_coverage_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_coverage_treatment_code_fkey"
            columns: ["treatment_code"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["treatment_code"]
          },
        ]
      }
      treatments: {
        Row: {
          category: string
          description: string
          pre_auth_typically_required: boolean
          treatment_code: string
        }
        Insert: {
          category: string
          description: string
          pre_auth_typically_required?: boolean
          treatment_code: string
        }
        Update: {
          category?: string
          description?: string
          pre_auth_typically_required?: boolean
          treatment_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
