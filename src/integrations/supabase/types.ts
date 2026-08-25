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
      accident_reports: {
        Row: {
          casualties: number
          county: string
          created_at: string
          description: string
          editor_note: string | null
          fatalities: number
          id: string
          latitude: number | null
          longitude: number | null
          occurred_at: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          road: string | null
          road_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
          vehicles_involved: number
        }
        Insert: {
          casualties?: number
          county: string
          created_at?: string
          description: string
          editor_note?: string | null
          fatalities?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          occurred_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          road?: string | null
          road_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          vehicles_involved?: number
        }
        Update: {
          casualties?: number
          county?: string
          created_at?: string
          description?: string
          editor_note?: string | null
          fatalities?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          occurred_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          road?: string | null
          road_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          vehicles_involved?: number
        }
        Relationships: []
      }
      alerts: {
        Row: {
          county: string
          created_at: string
          description: string
          hazard_type: string
          id: string
          latitude: number | null
          longitude: number | null
          road: string | null
          road_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          county: string
          created_at?: string
          description: string
          hazard_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          road?: string | null
          road_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          county?: string
          created_at?: string
          description?: string
          hazard_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          road?: string | null
          road_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banner_ads: {
        Row: {
          active: boolean
          advertiser: string | null
          created_at: string
          id: string
          image_url: string | null
          link_url: string
          title: string
        }
        Insert: {
          active?: boolean
          advertiser?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_url: string
          title: string
        }
        Update: {
          active?: boolean
          advertiser?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string
          title?: string
        }
        Relationships: []
      }
      cause_stats: {
        Row: {
          cause: string
          fatalities: number
          id: string
          share: number
          year: number
        }
        Insert: {
          cause: string
          fatalities: number
          id?: string
          share: number
          year: number
        }
        Update: {
          cause?: string
          fatalities?: number
          id?: string
          share?: number
          year?: number
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      county_stats: {
        Row: {
          county: string
          crashes: number
          fatalities: number
          id: string
          population: number | null
          serious_injuries: number | null
          year: number
        }
        Insert: {
          county: string
          crashes: number
          fatalities: number
          id?: string
          population?: number | null
          serious_injuries?: number | null
          year: number
        }
        Update: {
          county?: string
          crashes?: number
          fatalities?: number
          id?: string
          population?: number | null
          serious_injuries?: number | null
          year?: number
        }
        Relationships: []
      }
      monthly_stats: {
        Row: {
          crashes: number
          fatalities: number
          id: string
          month: number
          year: number
        }
        Insert: {
          crashes: number
          fatalities: number
          id?: string
          month: number
          year: number
        }
        Update: {
          crashes?: number
          fatalities?: number
          id?: string
          month?: number
          year?: number
        }
        Relationships: []
      }
      news: {
        Row: {
          author_id: string | null
          body: string
          category: string
          created_at: string
          featured: boolean
          id: string
          image_url: string | null
          published_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          source: string | null
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          category?: string
          created_at?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          published_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          source?: string | null
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          category?: string
          created_at?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          published_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          source?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          alerts: boolean
          articles: boolean
          interactions: boolean
          latitude: number | null
          longitude: number | null
          radius_km: number
          reports: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts?: boolean
          articles?: boolean
          interactions?: boolean
          latitude?: number | null
          longitude?: number | null
          radius_km?: number
          reports?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts?: boolean
          articles?: boolean
          interactions?: boolean
          latitude?: number | null
          longitude?: number | null
          radius_km?: number
          reports?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_enquiries: {
        Row: {
          budget: string | null
          company: string
          contact_email: string
          created_at: string
          goals: string
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          budget?: string | null
          company: string
          contact_email: string
          created_at?: string
          goals: string
          id?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          budget?: string | null
          company?: string
          contact_email?: string
          created_at?: string
          goals?: string
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          county: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      road_class_stats: {
        Row: {
          crashes: number
          fatalities: number
          id: string
          road_class: string
          year: number
        }
        Insert: {
          crashes: number
          fatalities: number
          id?: string
          road_class: string
          year: number
        }
        Update: {
          crashes?: number
          fatalities?: number
          id?: string
          road_class?: string
          year?: number
        }
        Relationships: []
      }
      roads: {
        Row: {
          authority: string | null
          county: string | null
          created_at: string
          id: string
          name: string
          road_class: string | null
          slug: string
          surface: string | null
        }
        Insert: {
          authority?: string | null
          county?: string | null
          created_at?: string
          id?: string
          name: string
          road_class?: string | null
          slug: string
          surface?: string | null
        }
        Update: {
          authority?: string | null
          county?: string | null
          created_at?: string
          id?: string
          name?: string
          road_class?: string | null
          slug?: string
          surface?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean
          expires_at: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          expires_at?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          expires_at?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_of_day_stats: {
        Row: {
          band: string
          fatalities: number
          id: string
          sort_order: number
          year: number
        }
        Insert: {
          band: string
          fatalities: number
          id?: string
          sort_order: number
          year: number
        }
        Update: {
          band?: string
          fatalities?: number
          id?: string
          sort_order?: number
          year?: number
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          created_at: string
          id: string
          rated_user_id: string
          rater_id: string
          stars: number
        }
        Insert: {
          created_at?: string
          id?: string
          rated_user_id: string
          rater_id: string
          stars: number
        }
        Update: {
          created_at?: string
          id?: string
          rated_user_id?: string
          rater_id?: string
          stars?: number
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_stats: {
        Row: {
          crashes: number
          fatalities: number
          id: string
          vehicle_type: string
          year: number
        }
        Insert: {
          crashes: number
          fatalities: number
          id?: string
          vehicle_type: string
          year: number
        }
        Update: {
          crashes?: number
          fatalities?: number
          id?: string
          vehicle_type?: string
          year?: number
        }
        Relationships: []
      }
      victim_stats: {
        Row: {
          category: string
          fatalities: number
          id: string
          year: number
        }
        Insert: {
          category: string
          fatalities: number
          id?: string
          year: number
        }
        Update: {
          category?: string
          fatalities?: number
          id?: string
          year?: number
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reviewed_by: string | null
          status: string
          title: string
          user_id: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string
          title: string
          user_id?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string
          title?: string
          user_id?: string | null
          video_url?: string
        }
        Relationships: []
      }
      yearly_stats: {
        Row: {
          crashes: number
          deaths_per_100k: number | null
          fatalities: number
          registered_vehicles: number | null
          serious_injuries: number
          slight_injuries: number
          year: number
        }
        Insert: {
          crashes: number
          deaths_per_100k?: number | null
          fatalities: number
          registered_vehicles?: number | null
          serious_injuries: number
          slight_injuries: number
          year: number
        }
        Update: {
          crashes?: number
          deaths_per_100k?: number | null
          fatalities?: number
          registered_vehicles?: number | null
          serious_injuries?: number
          slight_injuries?: number
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      has_min_role: {
        Args: {
          _min_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      role_rank: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member" | "guest_author" | "author" | "editor"
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
      app_role: ["admin", "moderator", "member", "guest_author", "author", "editor"],
    },
  },
} as const
