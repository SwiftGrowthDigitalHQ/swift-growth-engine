export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      leads: {
        Row: {
          business_type: string | null
          city: string | null
          created_at: string
          id: string
          name: string | null
          notes: string | null
          source: string | null
          status: string | null
          updated_at: string
          whatsapp: string
          whatsapp_opt_in: boolean
          whatsapp_opt_in_at: string | null
          whatsapp_opt_in_source: string | null
          whatsapp_opt_out: boolean
          whatsapp_opt_out_at: string | null
          whatsapp_last_message_at: string | null
        }
        Insert: {
          business_type?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          whatsapp: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
          whatsapp_opt_out?: boolean
          whatsapp_opt_out_at?: string | null
          whatsapp_last_message_at?: string | null
        }
        Update: {
          business_type?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          whatsapp?: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
          whatsapp_opt_out?: boolean
          whatsapp_opt_out_at?: string | null
          whatsapp_last_message_at?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          id: string
          meta_template_id: string | null
          waba_id: string
          name: string
          language: string
          namespace: string | null
          category: string | null
          status: string
          components: Json
          synced_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meta_template_id?: string | null
          waba_id: string
          name: string
          language: string
          namespace?: string | null
          category?: string | null
          status: string
          components?: Json
          synced_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meta_template_id?: string | null
          waba_id?: string
          name?: string
          language?: string
          namespace?: string | null
          category?: string | null
          status?: string
          components?: Json
          synced_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: {
          id: string
          name: string
          template_id: string
          template_components: Json
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          name: string
          template_id: string
          template_components?: Json
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          template_id?: string
          template_components?: Json
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_templates";
            referencedColumns: ["id"];
          },
        ]
      }
      whatsapp_campaign_recipients: {
        Row: {
          id: string
          campaign_id: string
          lead_id: string | null
          recipient_phone: string
          status: string
          failure_reason: string | null
          claimed_at: string | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          failed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          lead_id?: string | null
          recipient_phone: string
          status?: string
          failure_reason?: string | null
          claimed_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          failed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          lead_id?: string | null
          recipient_phone?: string
          status?: string
          failure_reason?: string | null
          claimed_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          failed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_recipients_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_campaign_recipients_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          id: string
          campaign_id: string | null
          campaign_recipient_id: string | null
          lead_id: string | null
          direction: string
          recipient_phone: string
          contact_name: string | null
          message_type: string
          content: Json
          status: string
          meta_message_id: string | null
          meta_timestamp: string | null
          request_metadata: Json
          response_metadata: Json
          error_metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          campaign_recipient_id?: string | null
          lead_id?: string | null
          direction: string
          recipient_phone: string
          contact_name?: string | null
          message_type: string
          content?: Json
          status?: string
          meta_message_id?: string | null
          meta_timestamp?: string | null
          request_metadata?: Json
          response_metadata?: Json
          error_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          campaign_recipient_id?: string | null
          lead_id?: string | null
          direction?: string
          recipient_phone?: string
          contact_name?: string | null
          message_type?: string
          content?: Json
          status?: string
          meta_message_id?: string | null
          meta_timestamp?: string | null
          request_metadata?: Json
          response_metadata?: Json
          error_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_campaign_recipient_id_fkey";
            columns: ["campaign_recipient_id"];
            isOneToOne: true;
            referencedRelation: "whatsapp_campaign_recipients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          id: string
          event_key: string
          event_type: string
          meta_message_id: string | null
          message_status: string | null
          event_timestamp: string | null
          metadata: Json
          received_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          event_key: string
          event_type: string
          meta_message_id?: string | null
          message_status?: string | null
          event_timestamp?: string | null
          metadata?: Json
          received_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          event_key?: string
          event_type?: string
          meta_message_id?: string | null
          message_status?: string | null
          event_timestamp?: string | null
          metadata?: Json
          received_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      whatsapp_worker_runs: {
        Row: {
          id: string
          status: string
          claimed_count: number
          sent_count: number
          failed_count: number
          error_code: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          status: string
          claimed_count?: number
          sent_count?: number
          failed_count?: number
          error_code?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          status?: string
          claimed_count?: number
          sent_count?: number
          failed_count?: number
          error_code?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      whatsapp_campaign_analytics: {
        Row: {
          campaign_id: string
          name: string
          campaign_status: string
          created_at: string
          completed_at: string | null
          total_recipients: number
          queued: number
          sending: number
          sent: number
          delivered: number
          read: number
          failed: number
          delivery_rate: number | null
          read_rate: number | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          recipient_phone: string
          lead_id: string | null
          contact_name: string | null
          lead_name: string | null
          lead_business_type: string | null
          lead_city: string | null
          lead_whatsapp: string | null
          total_messages: number
          inbound_count: number
          outbound_count: number
          unread_count: number
          last_message_at: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          last_message_id: string | null
          last_message_content: Json | null
          last_message_type: string | null
          last_message_direction: string | null
          last_message_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_whatsapp_campaign_recipients: {
        Args: { p_limit?: number }
        Returns: {
          recipient_id: string
          campaign_id: string
          lead_id: string
          recipient_phone: string
          template_name: string
          template_language: string
          template_namespace: string | null
          template_components: Json
        }[]
      }
      suppress_whatsapp_ineligible_recipients: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      apply_whatsapp_message_status: {
        Args: {
          p_meta_message_id: string
          p_status: string
          p_event_timestamp?: string | null
          p_error_metadata?: Json
          p_response_metadata?: Json
        }
        Returns: {
          message_id: string
          campaign_recipient_id: string | null
          lead_id: string | null
          resolved_status: string
        }[]
      }
      get_whatsapp_conversation_messages: {
        Args: { p_phone: string; p_limit?: number; p_before?: string | null }
        Returns: {
          id: string
          campaign_id: string | null
          campaign_recipient_id: string | null
          lead_id: string | null
          direction: string
          recipient_phone: string
          contact_name: string | null
          message_type: string
          content: Json
          status: string
          meta_message_id: string | null
          meta_timestamp: string | null
          request_metadata: Json
          response_metadata: Json
          error_metadata: Json
          created_at: string
          updated_at: string
          lead_name: string | null
          lead_business_type: string | null
          lead_city: string | null
        }[]
      }
      set_whatsapp_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      update_leads_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
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
