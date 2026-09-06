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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      dashboard_sections: {
        Row: {
          block_visible: boolean
          created_at: string
          id: string
          key: string
          label: string
          sort: number
          tab_visible: boolean
          updated_at: string
        }
        Insert: {
          block_visible?: boolean
          created_at?: string
          id?: string
          key: string
          label: string
          sort?: number
          tab_visible?: boolean
          updated_at?: string
        }
        Update: {
          block_visible?: boolean
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort?: number
          tab_visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      inspection_items: {
        Row: {
          carried_note: string | null
          id: string
          inspected_by: string
          item_key: string
          note: string
          project_id: string
          round: number
          space: string
          status: string
          updated_at: string
          values: Json
        }
        Insert: {
          carried_note?: string | null
          id?: string
          inspected_by?: string
          item_key: string
          note?: string
          project_id: string
          round?: number
          space: string
          status?: string
          updated_at?: string
          values?: Json
        }
        Update: {
          carried_note?: string | null
          id?: string
          inspected_by?: string
          item_key?: string
          note?: string
          project_id?: string
          round?: number
          space?: string
          status?: string
          updated_at?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          created_at: string
          id: string
          item_key: string
          name: string
          path: string
          project_id: string
          round: number
          space: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          name?: string
          path: string
          project_id: string
          round?: number
          space: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          name?: string
          path?: string
          project_id?: string
          round?: number
          space?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_circuits: {
        Row: {
          amperage: number
          created_at: string
          description: string
          elcb: boolean
          id: string
          panel_id: string
          poles: number
          project_id: string
          sort: number
          updated_at: string
          wire_spec: string
        }
        Insert: {
          amperage?: number
          created_at?: string
          description?: string
          elcb?: boolean
          id?: string
          panel_id: string
          poles?: number
          project_id: string
          sort?: number
          updated_at?: string
          wire_spec?: string
        }
        Update: {
          amperage?: number
          created_at?: string
          description?: string
          elcb?: boolean
          id?: string
          panel_id?: string
          poles?: number
          project_id?: string
          sort?: number
          updated_at?: string
          wire_spec?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_circuits_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "project_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_circuits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          roles: string[]
          sort: number
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          roles?: string[]
          sort?: number
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          roles?: string[]
          sort?: number
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_categories_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "project_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          id: string
          kind: string
          mime: string
          name: string
          path: string
          project_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          mime?: string
          name: string
          path: string
          project_id: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          mime?: string
          name?: string
          path?: string
          project_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_items: {
        Row: {
          category_id: string
          created_at: string
          fields: string[]
          hidden: boolean
          id: string
          project_id: string
          roles: string[]
          sort: number
          space_id: string
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          fields?: string[]
          hidden?: boolean
          id?: string
          project_id: string
          roles?: string[]
          sort?: number
          space_id: string
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          fields?: string[]
          hidden?: boolean
          id?: string
          project_id?: string
          roles?: string[]
          sort?: number
          space_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "project_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_panels: {
        Row: {
          amperage: string
          circuits: number | null
          created_at: string
          id: string
          name: string
          note: string
          project_id: string
          sort: number
          wire_spec: string
        }
        Insert: {
          amperage?: string
          circuits?: number | null
          created_at?: string
          id?: string
          name?: string
          note?: string
          project_id: string
          sort?: number
          wire_spec?: string
        }
        Update: {
          amperage?: string
          circuits?: number | null
          created_at?: string
          id?: string
          name?: string
          note?: string
          project_id?: string
          sort?: number
          wire_spec?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_panels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_signatures: {
        Row: {
          data_url: string
          id: string
          kind: string
          project_id: string
          signed_at: string
          signer_name: string
        }
        Insert: {
          data_url: string
          id?: string
          kind: string
          project_id: string
          signed_at?: string
          signer_name?: string
        }
        Update: {
          data_url?: string
          id?: string
          kind?: string
          project_id?: string
          signed_at?: string
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_signatures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_spaces: {
        Row: {
          brief_roles: string[]
          created_at: string
          dim_height: boolean
          dim_length: boolean
          dim_roles: string[]
          dim_width: boolean
          id: string
          name: string
          project_id: string
          show_brief: boolean
          show_dimensions: boolean
          sort: number
          window_roles: string[]
        }
        Insert: {
          brief_roles?: string[]
          created_at?: string
          dim_height?: boolean
          dim_length?: boolean
          dim_roles?: string[]
          dim_width?: boolean
          id?: string
          name: string
          project_id: string
          show_brief?: boolean
          show_dimensions?: boolean
          sort?: number
          window_roles?: string[]
        }
        Update: {
          brief_roles?: string[]
          created_at?: string
          dim_height?: boolean
          dim_length?: boolean
          dim_roles?: string[]
          dim_width?: boolean
          id?: string
          name?: string
          project_id?: string
          show_brief?: boolean
          show_dimensions?: boolean
          sort?: number
          window_roles?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "project_spaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_staff: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_staff_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          assigned_inspector: string | null
          builder_notes: string
          client_name: string
          client_phone: string
          created_at: string
          created_by: string
          current_round: number
          developer: string
          id: string
          inspection_date: string | null
          inspection_package: string
          inspection_time: string
          layout: string
          name: string
          notes: string
          notes_important: boolean
          property_type: string
          status: string
          team_members: string[]
          template_set_id: string | null
          total_ping: number | null
          unit: string
          updated_at: string
          vehicle: string
          video_post_url: string
          video_pre_url: string
        }
        Insert: {
          address?: string
          assigned_inspector?: string | null
          builder_notes?: string
          client_name?: string
          client_phone?: string
          created_at?: string
          created_by?: string
          current_round?: number
          developer?: string
          id?: string
          inspection_date?: string | null
          inspection_package?: string
          inspection_time?: string
          layout?: string
          name: string
          notes?: string
          notes_important?: boolean
          property_type?: string
          status?: string
          team_members?: string[]
          template_set_id?: string | null
          total_ping?: number | null
          unit?: string
          updated_at?: string
          vehicle?: string
          video_post_url?: string
          video_pre_url?: string
        }
        Update: {
          address?: string
          assigned_inspector?: string | null
          builder_notes?: string
          client_name?: string
          client_phone?: string
          created_at?: string
          created_by?: string
          current_round?: number
          developer?: string
          id?: string
          inspection_date?: string | null
          inspection_package?: string
          inspection_time?: string
          layout?: string
          name?: string
          notes?: string
          notes_important?: boolean
          property_type?: string
          status?: string
          team_members?: string[]
          template_set_id?: string | null
          total_ping?: number | null
          unit?: string
          updated_at?: string
          vehicle?: string
          video_post_url?: string
          video_pre_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_template_set_id_fkey"
            columns: ["template_set_id"]
            isOneToOne: false
            referencedRelation: "template_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      space_dimensions: {
        Row: {
          created_at: string
          height_cm: number | null
          id: string
          length_cm: number | null
          name: string
          note: string
          project_id: string
          sort: number
          space: string
          updated_at: string
          use_height: boolean
          use_length: boolean
          use_width: boolean
          width_cm: number | null
        }
        Insert: {
          created_at?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          name?: string
          note?: string
          project_id: string
          sort?: number
          space: string
          updated_at?: string
          use_height?: boolean
          use_length?: boolean
          use_width?: boolean
          width_cm?: number | null
        }
        Update: {
          created_at?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          name?: string
          note?: string
          project_id?: string
          sort?: number
          space?: string
          updated_at?: string
          use_height?: boolean
          use_length?: boolean
          use_width?: boolean
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "space_dimensions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      space_measurements: {
        Row: {
          height_cm: number | null
          id: string
          length_cm: number | null
          moisture_left: number | null
          moisture_right: number | null
          project_id: string
          space: string
          updated_at: string
          width_cm: number | null
        }
        Insert: {
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          moisture_left?: number | null
          moisture_right?: number | null
          project_id: string
          space: string
          updated_at?: string
          width_cm?: number | null
        }
        Update: {
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          moisture_left?: number | null
          moisture_right?: number | null
          project_id?: string
          space?: string
          updated_at?: string
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "space_measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      space_windows: {
        Row: {
          created_at: string
          id: string
          moisture_bottom: number | null
          moisture_left: number | null
          moisture_post_left: number | null
          moisture_post_right: number | null
          moisture_right: number | null
          name: string
          note: string
          project_id: string
          sort: number
          space: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          moisture_bottom?: number | null
          moisture_left?: number | null
          moisture_post_left?: number | null
          moisture_post_right?: number | null
          moisture_right?: number | null
          name: string
          note?: string
          project_id: string
          sort?: number
          space: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          moisture_bottom?: number | null
          moisture_left?: number | null
          moisture_post_left?: number | null
          moisture_post_right?: number | null
          moisture_right?: number | null
          name?: string
          note?: string
          project_id?: string
          sort?: number
          space?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_windows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          roles: string[]
          set_id: string | null
          sort: number
          spaces: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          roles?: string[]
          set_id?: string | null
          sort?: number
          spaces?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          roles?: string[]
          set_id?: string | null
          sort?: number
          spaces?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "template_categories_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "template_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          category_id: string
          created_at: string
          fields: string[]
          id: string
          roles: string[]
          sort: number
          spaces: string[]
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          fields?: string[]
          id?: string
          roles?: string[]
          sort?: number
          spaces?: string[]
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          fields?: string[]
          id?: string
          roles?: string[]
          sort?: number
          spaces?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sets: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          sort: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          sort?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      template_spaces: {
        Row: {
          created_at: string
          id: string
          name: string
          set_id: string | null
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          set_id?: string | null
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          set_id?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_spaces_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "template_sets"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project: { Args: { _project_id: string }; Returns: boolean }
      ensure_membership: {
        Args: { _email: string; _full_name: string }
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
      app_role: "admin" | "inspector"
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
      app_role: ["admin", "inspector"],
    },
  },
} as const
