export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          telegram_user_id: number | null;
          telegram_username: string | null;
          telegram_link_code: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          username?: string | null;
          telegram_user_id?: number | null;
          telegram_username?: string | null;
          telegram_link_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          username?: string | null;
          telegram_user_id?: number | null;
          telegram_username?: string | null;
          telegram_link_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      boards: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'boards_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      board_members: {
        Row: {
          board_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          board_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          board_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'board_members_board_id_fkey';
            columns: ['board_id'];
            isOneToOne: false;
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'board_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          board_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          board_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          board_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_board_id_fkey';
            columns: ['board_id'];
            isOneToOne: false;
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          }
        ];
      };
      links: {
        Row: {
          id: string;
          board_id: string;
          submitted_by: string | null;
          url: string;
          platform: string;
          content_type: 'image' | 'video' | 'link';
          title: string | null;
          description: string | null;
          thumbnail_url: string | null;
          category_id: string | null;
          embed_type: string | null;
          external_id: string | null;
          resolved_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          submitted_by?: string | null;
          url: string;
          platform?: string;
          content_type?: 'image' | 'video' | 'link';
          title?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          category_id?: string | null;
          embed_type?: string | null;
          external_id?: string | null;
          resolved_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          submitted_by?: string | null;
          url?: string;
          platform?: string;
          content_type?: 'image' | 'video' | 'link';
          title?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          category_id?: string | null;
          embed_type?: string | null;
          external_id?: string | null;
          resolved_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'links_board_id_fkey';
            columns: ['board_id'];
            isOneToOne: false;
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'links_submitted_by_fkey';
            columns: ['submitted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'links_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      board_invites: {
        Row: {
          id: string;
          board_id: string;
          token_hash: string;
          created_by: string | null;
          expires_at: string | null;
          max_uses: number | null;
          uses_count: number;
          is_revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          token_hash: string;
          created_by?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          uses_count?: number;
          is_revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          token_hash?: string;
          created_by?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          uses_count?: number;
          is_revoked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'board_invites_board_id_fkey';
            columns: ['board_id'];
            isOneToOne: false;
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          }
        ];
      };
      rate_limits: {
        Row: {
          key: string;
          count: number;
          reset_at: string;
        };
        Insert: {
          key: string;
          count?: number;
          reset_at: string;
        };
        Update: {
          key?: string;
          count?: number;
          reset_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          username: string | null;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      link_telegram_account: {
        Args: {
          p_code: string;
          p_telegram_user_id: number;
          p_telegram_username: string;
        };
        Returns: Json;
      };
      telegram_submit_link: {
        Args: {
          p_telegram_user_id: number;
          p_url: string;
          p_platform?: string;
          p_title?: string | null;
          p_category_id?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Board = Database['public']['Tables']['boards']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type LinkRow = Database['public']['Tables']['links']['Row'];

export interface LinkWithDetails extends LinkRow {
  profile?: {
    id?: string;
    username: string | null;
    email: string | null;
  } | null;
  category?: Category | null;
}
