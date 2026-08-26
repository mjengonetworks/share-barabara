export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      accident_report_views: {
        Row: {
          created_at: string;
          id: number;
          report_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          report_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accident_report_views_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "accident_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      accident_reports: {
        Row: {
          casualties: number;
          casualty_breakdown: Json;
          county: string;
          created_at: string;
          description: string;
          editor_note: string | null;
          fatalities: number;
          id: string;
          image_url: string | null;
          is_anonymous: boolean;
          latitude: number | null;
          longitude: number | null;
          occurred_at: string;
          page_id: string | null;
          parties_involved: string[];
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          road: string | null;
          road_id: string | null;
          severity: string;
          seo_description: string | null;
          seo_keywords: string | null;
          seo_title: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
          vehicles_involved: number;
        };
        Insert: {
          casualties?: number;
          casualty_breakdown?: Json;
          county: string;
          created_at?: string;
          description: string;
          editor_note?: string | null;
          fatalities?: number;
          id?: string;
          image_url?: string | null;
          is_anonymous?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          occurred_at?: string;
          page_id?: string | null;
          parties_involved?: string[];
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          road?: string | null;
          road_id?: string | null;
          severity?: string;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
          vehicles_involved?: number;
        };
        Update: {
          casualties?: number;
          casualty_breakdown?: Json;
          county?: string;
          created_at?: string;
          description?: string;
          editor_note?: string | null;
          fatalities?: number;
          id?: string;
          image_url?: string | null;
          is_anonymous?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          occurred_at?: string;
          page_id?: string | null;
          parties_involved?: string[];
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          road?: string | null;
          road_id?: string | null;
          severity?: string;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          vehicles_involved?: number;
        };
        Relationships: [
          {
            foreignKeyName: "accident_reports_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accident_reports_road_id_fkey";
            columns: ["road_id"];
            isOneToOne: false;
            referencedRelation: "roads";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_views: {
        Row: {
          alert_id: string;
          created_at: string;
          id: number;
        };
        Insert: {
          alert_id: string;
          created_at?: string;
          id?: number;
        };
        Update: {
          alert_id?: string;
          created_at?: string;
          id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "alert_views_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          casualty_breakdown: Json;
          county: string;
          created_at: string;
          description: string;
          hazard_type: string;
          id: string;
          image_url: string | null;
          is_anonymous: boolean;
          latitude: number | null;
          longitude: number | null;
          page_id: string | null;
          parties_involved: string[];
          road: string | null;
          road_id: string | null;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          casualty_breakdown?: Json;
          county: string;
          created_at?: string;
          description: string;
          hazard_type?: string;
          id?: string;
          image_url?: string | null;
          is_anonymous?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          page_id?: string | null;
          parties_involved?: string[];
          road?: string | null;
          road_id?: string | null;
          severity?: string;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          casualty_breakdown?: Json;
          county?: string;
          created_at?: string;
          description?: string;
          hazard_type?: string;
          id?: string;
          image_url?: string | null;
          is_anonymous?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          page_id?: string | null;
          parties_involved?: string[];
          road?: string | null;
          road_id?: string | null;
          severity?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_road_id_fkey";
            columns: ["road_id"];
            isOneToOne: false;
            referencedRelation: "roads";
            referencedColumns: ["id"];
          },
        ];
      };
      banner_ads: {
        Row: {
          active: boolean;
          advertiser: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          link_url: string;
          title: string;
        };
        Insert: {
          active?: boolean;
          advertiser?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          link_url: string;
          title: string;
        };
        Update: {
          active?: boolean;
          advertiser?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          link_url?: string;
          title?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string;
          end_date: string;
          id: string;
          image_url: string | null;
          report_content: string | null;
          report_image_url: string | null;
          slug: string;
          start_date: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description: string;
          end_date: string;
          id?: string;
          image_url?: string | null;
          report_content?: string | null;
          report_image_url?: string | null;
          slug: string;
          start_date: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          end_date?: string;
          id?: string;
          image_url?: string | null;
          report_content?: string | null;
          report_image_url?: string | null;
          slug?: string;
          start_date?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cause_stats: {
        Row: {
          cause: string;
          fatalities: number;
          id: string;
          share: number;
          year: number;
        };
        Insert: {
          cause: string;
          fatalities: number;
          id?: string;
          share: number;
          year: number;
        };
        Update: {
          cause?: string;
          fatalities?: number;
          id?: string;
          share?: number;
          year?: number;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          page_id: string | null;
          parent_comment_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          page_id?: string | null;
          parent_comment_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          page_id?: string | null;
          parent_comment_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      content_requests: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          message: string;
          request_type: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          message: string;
          request_type: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          message?: string;
          request_type?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      county_stats: {
        Row: {
          county: string;
          crashes: number;
          fatalities: number;
          id: string;
          population: number | null;
          serious_injuries: number | null;
          year: number;
        };
        Insert: {
          county: string;
          crashes: number;
          fatalities: number;
          id?: string;
          population?: number | null;
          serious_injuries?: number | null;
          year: number;
        };
        Update: {
          county?: string;
          crashes?: number;
          fatalities?: number;
          id?: string;
          population?: number | null;
          serious_injuries?: number | null;
          year?: number;
        };
        Relationships: [];
      };
      featured_picks: {
        Row: {
          page_id: string | null;
          slot: string;
          updated_at: string;
          updated_by: string | null;
          user_id: string | null;
        };
        Insert: {
          page_id?: string | null;
          slot: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string | null;
        };
        Update: {
          page_id?: string | null;
          slot?: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "featured_picks_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
        ];
      };
      infrastructure_issues: {
        Row: {
          authority: string | null;
          content: string;
          county: string | null;
          created_at: string;
          editor_note: string | null;
          id: string;
          image_url: string | null;
          is_anonymous: boolean;
          page_id: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          road_name: string;
          road_scope: string;
          status: string;
          structure_type: string;
          summary: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          authority?: string | null;
          content: string;
          county?: string | null;
          created_at?: string;
          editor_note?: string | null;
          id?: string;
          image_url?: string | null;
          is_anonymous?: boolean;
          page_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          road_name: string;
          road_scope?: string;
          status?: string;
          structure_type?: string;
          summary: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          authority?: string | null;
          content?: string;
          county?: string | null;
          created_at?: string;
          editor_note?: string | null;
          id?: string;
          image_url?: string | null;
          is_anonymous?: boolean;
          page_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          road_name?: string;
          road_scope?: string;
          status?: string;
          structure_type?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      hub_stats: {
        Row: {
          id: string;
          label: string;
          link_url: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          value: string;
        };
        Insert: {
          id?: string;
          label: string;
          link_url?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Update: {
          id?: string;
          label?: string;
          link_url?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      merch_items: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          price_kes: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          price_kes: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          price_kes?: number;
        };
        Relationships: [];
      };
      merch_orders: {
        Row: {
          contact_name: string;
          contact_phone: string;
          created_at: string;
          delivery_address: string | null;
          delivery_county: string | null;
          delivery_notes: string | null;
          id: string;
          item_id: string | null;
          quantity: number;
          status: string;
          user_id: string | null;
        };
        Insert: {
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          delivery_address?: string | null;
          delivery_county?: string | null;
          delivery_notes?: string | null;
          id?: string;
          item_id?: string | null;
          quantity?: number;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          delivery_address?: string | null;
          delivery_county?: string | null;
          delivery_notes?: string | null;
          id?: string;
          item_id?: string | null;
          quantity?: number;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "merch_orders_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "merch_items";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_stats: {
        Row: {
          crashes: number;
          fatalities: number;
          id: string;
          month: number;
          year: number;
        };
        Insert: {
          crashes: number;
          fatalities: number;
          id?: string;
          month: number;
          year: number;
        };
        Update: {
          crashes?: number;
          fatalities?: number;
          id?: string;
          month?: number;
          year?: number;
        };
        Relationships: [];
      };
      news: {
        Row: {
          author_id: string | null;
          body: string;
          category: string;
          created_at: string;
          featured: boolean;
          id: string;
          image_url: string | null;
          page_id: string | null;
          published_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          seo_description: string | null;
          seo_keywords: string | null;
          seo_title: string | null;
          source: string | null;
          status: string;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          category?: string;
          created_at?: string;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          page_id?: string | null;
          published_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          source?: string | null;
          status?: string;
          summary: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          category?: string;
          created_at?: string;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          page_id?: string | null;
          published_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          source?: string | null;
          status?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
        ];
      };
      news_views: {
        Row: {
          created_at: string;
          id: number;
          news_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          news_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          news_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_views_news_id_fkey";
            columns: ["news_id"];
            isOneToOne: false;
            referencedRelation: "news";
            referencedColumns: ["id"];
          },
        ];
      };
      newsletter_broadcasts: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          recipient_count: number;
          sent_by: string | null;
          subject: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          recipient_count?: number;
          sent_by?: string | null;
          subject: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          recipient_count?: number;
          sent_by?: string | null;
          subject?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          alerts: boolean;
          articles: boolean;
          interactions: boolean;
          latitude: number | null;
          longitude: number | null;
          radius_km: number;
          reports: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          alerts?: boolean;
          articles?: boolean;
          interactions?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          radius_km?: number;
          reports?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          alerts?: boolean;
          articles?: boolean;
          interactions?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          radius_km?: number;
          reports?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      page_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          category: string;
          county: string | null;
          created_at: string;
          description: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          owner_id: string;
          phone: string | null;
          slug: string;
          updated_at: string;
          verified: boolean;
          website_url: string | null;
        };
        Insert: {
          category?: string;
          county?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          phone?: string | null;
          slug: string;
          updated_at?: string;
          verified?: boolean;
          website_url?: string | null;
        };
        Update: {
          category?: string;
          county?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          slug?: string;
          updated_at?: string;
          verified?: boolean;
          website_url?: string | null;
        };
        Relationships: [];
      };
      partner_enquiries: {
        Row: {
          budget: string | null;
          company: string;
          contact_email: string;
          created_at: string;
          goals: string;
          id: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          budget?: string | null;
          company: string;
          contact_email: string;
          created_at?: string;
          goals: string;
          id?: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          budget?: string | null;
          company?: string;
          contact_email?: string;
          created_at?: string;
          goals?: string;
          id?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          county: string | null;
          created_at: string;
          display_name: string;
          id: string;
          mjengo_hub_url: string | null;
          mjengo_networks_url: string | null;
          occupation: string | null;
          referral_code: string | null;
          referral_points: number;
          road_safety_message: string | null;
          suspended: boolean;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          county?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          mjengo_hub_url?: string | null;
          mjengo_networks_url?: string | null;
          occupation?: string | null;
          referral_code?: string | null;
          referral_points?: number;
          road_safety_message?: string | null;
          suspended?: boolean;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          county?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          mjengo_hub_url?: string | null;
          mjengo_networks_url?: string | null;
          occupation?: string | null;
          referral_code?: string | null;
          referral_points?: number;
          road_safety_message?: string | null;
          suspended?: boolean;
          username?: string | null;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          code_used: string;
          created_at: string;
          id: string;
          referee_id: string;
          referrer_id: string;
          signup_awarded_at: string | null;
          subscribe_awarded_at: string | null;
        };
        Insert: {
          code_used: string;
          created_at?: string;
          id?: string;
          referee_id: string;
          referrer_id: string;
          signup_awarded_at?: string | null;
          subscribe_awarded_at?: string | null;
        };
        Update: {
          code_used?: string;
          created_at?: string;
          id?: string;
          referee_id?: string;
          referrer_id?: string;
          signup_awarded_at?: string | null;
          subscribe_awarded_at?: string | null;
        };
        Relationships: [];
      };
      quote_submissions: {
        Row: {
          author: string | null;
          created_at: string;
          id: string;
          quote: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          author?: string | null;
          created_at?: string;
          id?: string;
          quote: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          author?: string | null;
          created_at?: string;
          id?: string;
          quote?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      road_class_stats: {
        Row: {
          crashes: number;
          fatalities: number;
          id: string;
          road_class: string;
          year: number;
        };
        Insert: {
          crashes: number;
          fatalities: number;
          id?: string;
          road_class: string;
          year: number;
        };
        Update: {
          crashes?: number;
          fatalities?: number;
          id?: string;
          road_class?: string;
          year?: number;
        };
        Relationships: [];
      };
      roads: {
        Row: {
          authority: string | null;
          county: string | null;
          created_at: string;
          id: string;
          name: string;
          road_class: string | null;
          slug: string;
          surface: string | null;
        };
        Insert: {
          authority?: string | null;
          county?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          road_class?: string | null;
          slug: string;
          surface?: string | null;
        };
        Update: {
          authority?: string | null;
          county?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          road_class?: string | null;
          slug?: string;
          surface?: string | null;
        };
        Relationships: [];
      };
      site_quote: {
        Row: {
          author: string | null;
          id: number;
          quote: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          author?: string | null;
          id?: number;
          quote: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          author?: string | null;
          id?: number;
          quote?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          contact_email: string;
          contact_phone: string;
          footer_tagline: string;
          id: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          contact_email?: string;
          contact_phone?: string;
          footer_tagline?: string;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          contact_email?: string;
          contact_phone?: string;
          footer_tagline?: string;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      social_links: {
        Row: {
          active: boolean;
          created_at: string;
          href: string;
          icon_key: string;
          id: string;
          label: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          href: string;
          icon_key: string;
          id?: string;
          label: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          href?: string;
          icon_key?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          active: boolean;
          expires_at: string | null;
          tier: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          expires_at?: string | null;
          tier?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          expires_at?: string | null;
          tier?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      time_of_day_stats: {
        Row: {
          band: string;
          fatalities: number;
          id: string;
          sort_order: number;
          year: number;
        };
        Insert: {
          band: string;
          fatalities: number;
          id?: string;
          sort_order: number;
          year: number;
        };
        Update: {
          band?: string;
          fatalities?: number;
          id?: string;
          sort_order?: number;
          year?: number;
        };
        Relationships: [];
      };
      user_ratings: {
        Row: {
          created_at: string;
          id: string;
          rated_user_id: string;
          rater_id: string;
          stars: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          rated_user_id: string;
          rater_id: string;
          stars: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          rated_user_id?: string;
          rater_id?: string;
          stars?: number;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vehicle_stats: {
        Row: {
          crashes: number;
          fatalities: number;
          id: string;
          vehicle_type: string;
          year: number;
        };
        Insert: {
          crashes: number;
          fatalities: number;
          id?: string;
          vehicle_type: string;
          year: number;
        };
        Update: {
          crashes?: number;
          fatalities?: number;
          id?: string;
          vehicle_type?: string;
          year?: number;
        };
        Relationships: [];
      };
      victim_stats: {
        Row: {
          category: string;
          fatalities: number;
          id: string;
          year: number;
        };
        Insert: {
          category: string;
          fatalities: number;
          id?: string;
          year: number;
        };
        Update: {
          category?: string;
          fatalities?: number;
          id?: string;
          year?: number;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          reviewed_by: string | null;
          status: string;
          title: string;
          user_id: string | null;
          video_url: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          reviewed_by?: string | null;
          status?: string;
          title: string;
          user_id?: string | null;
          video_url: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          reviewed_by?: string | null;
          status?: string;
          title?: string;
          user_id?: string | null;
          video_url?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          user_id: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          user_id: string;
          value: number;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [];
      };
      yearly_stats: {
        Row: {
          crashes: number;
          deaths_per_100k: number | null;
          fatalities: number;
          registered_vehicles: number | null;
          serious_injuries: number;
          slight_injuries: number;
          year: number;
        };
        Insert: {
          crashes: number;
          deaths_per_100k?: number | null;
          fatalities: number;
          registered_vehicles?: number | null;
          serious_injuries: number;
          slight_injuries: number;
          year: number;
        };
        Update: {
          crashes?: number;
          deaths_per_100k?: number | null;
          fatalities?: number;
          registered_vehicles?: number | null;
          serious_injuries?: number;
          slight_injuries?: number;
          year?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_referral_code: { Args: { _code: string }; Returns: boolean };
      generate_referral_code: { Args: never; Returns: string };
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean };
      has_min_role: {
        Args: {
          _min_role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_suspended: { Args: { _user_id: string }; Returns: boolean };
      owns_page: {
        Args: { _page_id: string; _user_id: string };
        Returns: boolean;
      };
      role_rank: {
        Args: { _role: Database["public"]["Enums"]["app_role"] };
        Returns: number;
      };
      trending_news: {
        Args: { hours_back?: number; result_limit?: number };
        Returns: {
          author_id: string | null;
          body: string;
          category: string;
          created_at: string;
          featured: boolean;
          id: string;
          image_url: string | null;
          page_id: string | null;
          published_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          source: string | null;
          status: string;
          summary: string;
          title: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "news";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      trending_alerts: {
        Args: { hours_back?: number; result_limit?: number };
        Returns: {
          casualty_breakdown: Json;
          county: string;
          created_at: string;
          description: string;
          hazard_type: string;
          id: string;
          image_url: string | null;
          is_anonymous: boolean;
          latitude: number | null;
          longitude: number | null;
          page_id: string | null;
          parties_involved: string[];
          road: string | null;
          road_id: string | null;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "alerts";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      trending_reports: {
        Args: { hours_back?: number; result_limit?: number };
        Returns: {
          casualties: number;
          casualty_breakdown: Json;
          county: string;
          created_at: string;
          description: string;
          editor_note: string | null;
          fatalities: number;
          id: string;
          image_url: string | null;
          is_anonymous: boolean;
          latitude: number | null;
          longitude: number | null;
          occurred_at: string;
          page_id: string | null;
          parties_involved: string[];
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          road: string | null;
          road_id: string | null;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
          vehicles_involved: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "accident_reports";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "member" | "guest_author" | "author" | "editor";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "member", "guest_author", "author", "editor"],
    },
  },
} as const;
