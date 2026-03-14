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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      company_settings: {
        Row: {
          company_address: string | null
          company_city: string | null
          company_country: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          created_at: string
          currency: string
          currency_symbol: string
          default_tax_rate: number
          id: string
          logo_url: string | null
          notes: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string
          currency?: string
          currency_symbol?: string
          default_tax_rate?: number
          id?: string
          logo_url?: string | null
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string
          currency?: string
          currency_symbol?: string
          default_tax_rate?: number
          id?: string
          logo_url?: string | null
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_name: string
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          tax_id: string | null
          total_events: number
          total_revenue: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          total_events?: number
          total_revenue?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          total_events?: number
          total_revenue?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["equipment_category"]
          condition: Database["public"]["Enums"]["equipment_condition"]
          created_at: string
          current_location: Database["public"]["Enums"]["equipment_location"]
          gross_price_per_day: number
          id: string
          image_url: string | null
          model: string | null
          name: string
          notes: string | null
          power_consumption_watts: number | null
          quantity_available: number
          quantity_total: number
          serial_number: string | null
          subcategory: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          brand?: string | null
          category: Database["public"]["Enums"]["equipment_category"]
          condition?: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string
          current_location?: Database["public"]["Enums"]["equipment_location"]
          gross_price_per_day?: number
          id?: string
          image_url?: string | null
          model?: string | null
          name: string
          notes?: string | null
          power_consumption_watts?: number | null
          quantity_available?: number
          quantity_total?: number
          serial_number?: string | null
          subcategory?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["equipment_category"]
          condition?: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string
          current_location?: Database["public"]["Enums"]["equipment_location"]
          gross_price_per_day?: number
          id?: string
          image_url?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          power_consumption_watts?: number | null
          quantity_available?: number
          quantity_total?: number
          serial_number?: string | null
          subcategory?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      event_equipment: {
        Row: {
          equipment_id: string
          event_id: string
          id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          equipment_id: string
          event_id: string
          id?: string
          notes?: string | null
          quantity?: number
        }
        Update: {
          equipment_id?: string
          event_id?: string
          id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_equipment_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team: {
        Row: {
          event_id: string
          id: string
          notes: string | null
          role_on_event: string | null
          team_member_id: string
        }
        Insert: {
          event_id: string
          id?: string
          notes?: string | null
          role_on_event?: string | null
          team_member_id: string
        }
        Update: {
          event_id?: string
          id?: string
          notes?: string | null
          role_on_event?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_team_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_vehicles: {
        Row: {
          event_id: string
          id: string
          notes: string | null
          vehicle_id: string
        }
        Insert: {
          event_id: string
          id?: string
          notes?: string | null
          vehicle_id: string
        }
        Update: {
          event_id?: string
          id?: string
          notes?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_vehicles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          end_date: string
          id: string
          load_in_date: string | null
          load_out_date: string | null
          name: string
          notes: string | null
          project_manager_id: string | null
          quote_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          venue: string | null
          venue_address: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          end_date: string
          id?: string
          load_in_date?: string | null
          load_out_date?: string | null
          name: string
          notes?: string | null
          project_manager_id?: string | null
          quote_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          venue_address?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          end_date?: string
          id?: string
          load_in_date?: string | null
          load_out_date?: string | null
          name?: string
          notes?: string | null
          project_manager_id?: string | null
          quote_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          venue_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          created_at: string
          days: number
          description: string
          id: string
          item_type: Database["public"]["Enums"]["line_item_type"]
          line_total: number
          quantity: number
          quote_id: string
          sort_order: number
          source_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          days?: number
          description: string
          id?: string
          item_type?: Database["public"]["Enums"]["line_item_type"]
          line_total?: number
          quantity?: number
          quote_id: string
          sort_order?: number
          source_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          days?: number
          description?: string
          id?: string
          item_type?: Database["public"]["Enums"]["line_item_type"]
          line_total?: number
          quantity?: number
          quote_id?: string
          sort_order?: number
          source_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          budget_range: string | null
          contact_company: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string | null
          details: string | null
          end_date: string | null
          estimated_audience_size: string | null
          event_name: string
          event_type: string
          file_name: string | null
          file_url: string | null
          id: string
          services_needed: string[] | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string | null
          venue: string | null
        }
        Insert: {
          admin_notes?: string | null
          budget_range?: string | null
          contact_company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          details?: string | null
          end_date?: string | null
          estimated_audience_size?: string | null
          event_name: string
          event_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          services_needed?: string[] | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue?: string | null
        }
        Update: {
          admin_notes?: string | null
          budget_range?: string | null
          contact_company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          details?: string | null
          end_date?: string | null
          estimated_audience_size?: string | null
          event_name?: string
          event_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          services_needed?: string[] | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          discount_percent: number
          event_date: string | null
          event_end_date: string | null
          event_name: string
          id: string
          notes: string | null
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_percent: number
          total: number
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          discount_percent?: number
          event_date?: string | null
          event_end_date?: string | null
          event_name: string
          id?: string
          notes?: string | null
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_percent?: number
          total?: number
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          discount_percent?: number
          event_date?: string | null
          event_end_date?: string | null
          event_name?: string
          id?: string
          notes?: string | null
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_percent?: number
          total?: number
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          daily_rate: number
          email: string | null
          full_name: string
          id: string
          is_available: boolean
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["team_role"]
          skills: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          daily_rate?: number
          email?: string | null
          full_name: string
          id?: string
          is_available?: boolean
          notes?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["team_role"]
          skills?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          daily_rate?: number
          email?: string | null
          full_name?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          skills?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity_kg: number | null
          capacity_volume_m3: number | null
          created_at: string
          current_status: Database["public"]["Enums"]["vehicle_status"]
          daily_cost: number
          driver_id: string | null
          id: string
          is_available: boolean
          license_plate: string
          name: string
          notes: string | null
          type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          capacity_kg?: number | null
          capacity_volume_m3?: number | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["vehicle_status"]
          daily_cost?: number
          driver_id?: string | null
          id?: string
          is_available?: boolean
          license_plate: string
          name: string
          notes?: string | null
          type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          capacity_kg?: number | null
          capacity_volume_m3?: number | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["vehicle_status"]
          daily_cost?: number
          driver_id?: string | null
          id?: string
          is_available?: boolean
          license_plate?: string
          name?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_customer_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "team_member" | "customer"
      customer_type: "Corporate" | "Agency" | "Individual" | "Government"
      equipment_category:
        | "Light"
        | "Sound"
        | "Video/Image"
        | "Truss"
        | "Rigging"
        | "Power/Cable"
        | "Other"
      equipment_condition: "Excellent" | "Good" | "Fair" | "Needs Repair"
      equipment_location:
        | "Warehouse"
        | "On Event"
        | "In Transit"
        | "Under Maintenance"
      event_status:
        | "Planning"
        | "Confirmed"
        | "In Progress"
        | "Completed"
        | "Cancelled"
      line_item_type: "Equipment" | "Personnel" | "Vehicle" | "Custom"
      quote_status: "Draft" | "Sent" | "Approved" | "Rejected" | "Cancelled"
      team_role:
        | "Project Manager"
        | "Light Technician"
        | "Sound Technician"
        | "Video Technician"
        | "Rigger"
        | "Stage Hand"
        | "Driver"
        | "General Crew"
      vehicle_status:
        | "In Garage"
        | "On Route"
        | "On Event Site"
        | "Under Maintenance"
      vehicle_type: "Truck" | "Van" | "Trailer" | "Crane" | "Other"
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
      app_role: ["admin", "team_member", "customer"],
      customer_type: ["Corporate", "Agency", "Individual", "Government"],
      equipment_category: [
        "Light",
        "Sound",
        "Video/Image",
        "Truss",
        "Rigging",
        "Power/Cable",
        "Other",
      ],
      equipment_condition: ["Excellent", "Good", "Fair", "Needs Repair"],
      equipment_location: [
        "Warehouse",
        "On Event",
        "In Transit",
        "Under Maintenance",
      ],
      event_status: [
        "Planning",
        "Confirmed",
        "In Progress",
        "Completed",
        "Cancelled",
      ],
      line_item_type: ["Equipment", "Personnel", "Vehicle", "Custom"],
      quote_status: ["Draft", "Sent", "Approved", "Rejected", "Cancelled"],
      team_role: [
        "Project Manager",
        "Light Technician",
        "Sound Technician",
        "Video Technician",
        "Rigger",
        "Stage Hand",
        "Driver",
        "General Crew",
      ],
      vehicle_status: [
        "In Garage",
        "On Route",
        "On Event Site",
        "Under Maintenance",
      ],
      vehicle_type: ["Truck", "Van", "Trailer", "Crane", "Other"],
    },
  },
} as const
