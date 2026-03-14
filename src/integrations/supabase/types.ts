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
