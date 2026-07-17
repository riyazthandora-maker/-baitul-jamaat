export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "super_admin" | "masjid_admin" | "member";
export type MemberStatus = "pending" | "active" | "inactive" | "rejected";

export interface Database {
  public: {
    Tables: {
      masjids: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          address: string;
          phone: string;
          lat: number | null;
          lng: number | null;
          upi_id: string | null;
          active: boolean;
          masjid_code: string;
          member_seq: number;
          receipt_seq: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          address: string;
          phone: string;
          lat?: number | null;
          lng?: number | null;
          upi_id?: string | null;
          active?: boolean;
          masjid_code: string;
          member_seq?: number;
          receipt_seq?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          address?: string;
          phone?: string;
          lat?: number | null;
          lng?: number | null;
          upi_id?: string | null;
          active?: boolean;
          masjid_code?: string;
          member_seq?: number;
          receipt_seq?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string | null;
          role: UserRole;
          full_name: string;
          phone: string;
          force_password_change: boolean;
        };
        Insert: {
          id: string;
          created_at?: string;
          masjid_id?: string | null;
          role?: UserRole;
          full_name: string;
          phone: string;
          force_password_change?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          masjid_id?: string | null;
          role?: UserRole;
          full_name?: string;
          phone?: string;
          force_password_change?: boolean;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string;
          profile_id: string | null;
          member_number: string | null;
          status: MemberStatus;
          photo_url: string | null;
          id_doc_url: string | null;
          id_doc_back_url: string | null;
          id_type: string | null;
          id_last4: string | null;
          full_name: string;
          dob: string | null;
          gender: string | null;
          address: string | null;
          qualification: string | null;
          phone: string;
          email: string | null;
          duplicate_flag: string | null;
          duplicate_reason: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id: string;
          profile_id?: string | null;
          member_number?: string | null;
          status?: MemberStatus;
          photo_url?: string | null;
          id_doc_url?: string | null;
          id_doc_back_url?: string | null;
          id_type?: string | null;
          id_last4?: string | null;
          full_name: string;
          dob?: string | null;
          gender?: string | null;
          address?: string | null;
          qualification?: string | null;
          phone: string;
          email?: string | null;
          duplicate_flag?: string | null;
          duplicate_reason?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          masjid_id?: string;
          profile_id?: string | null;
          member_number?: string | null;
          status?: MemberStatus;
          photo_url?: string | null;
          id_doc_url?: string | null;
          id_doc_back_url?: string | null;
          id_type?: string | null;
          id_last4?: string | null;
          full_name?: string;
          dob?: string | null;
          gender?: string | null;
          address?: string | null;
          qualification?: string | null;
          phone?: string;
          email?: string | null;
          duplicate_flag?: string | null;
          duplicate_reason?: string | null;
        };
        Relationships: [];
      };
      outbox: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string | null;
          to_email: string;
          subject: string;
          html: string;
          sent: boolean;
          error: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id?: string | null;
          to_email: string;
          subject: string;
          html: string;
          sent?: boolean;
          error?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          masjid_id?: string | null;
          to_email?: string;
          subject?: string;
          html?: string;
          sent?: boolean;
          error?: string | null;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string;
          name: string;
          default_amount: number;
          recurrence: "monthly" | "yearly";
          start_date: string;
          end_date: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id: string;
          name: string;
          default_amount: number;
          recurrence: "monthly" | "yearly";
          start_date: string;
          end_date?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          masjid_id?: string;
          name?: string;
          default_amount?: number;
          recurrence?: "monthly" | "yearly";
          start_date?: string;
          end_date?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string;
          program_id: string;
          member_id: string;
          amount: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id: string;
          program_id: string;
          member_id: string;
          amount: number;
        };
        Update: {
          id?: string;
          amount?: number;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string;
          member_id: string;
          receipt_number: string;
          amount: number;
          notes: string | null;
          voided_at: string | null;
          void_reason: string | null;
          pdf_path: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id: string;
          member_id: string;
          receipt_number: string;
          amount: number;
          notes?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          pdf_path?: string | null;
        };
        Update: {
          notes?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          pdf_path?: string | null;
        };
        Relationships: [];
      };
      ledger: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string;
          member_id: string;
          program_id: string | null;
          enrollment_id: string | null;
          receipt_id: string | null;
          type: "charge" | "discount" | "payment";
          amount: number;
          description: string | null;
          period_key: string | null;
          voided_at: string | null;
          void_reason: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id: string;
          member_id: string;
          program_id?: string | null;
          enrollment_id?: string | null;
          receipt_id?: string | null;
          type: "charge" | "discount" | "payment";
          amount: number;
          description?: string | null;
          period_key?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Update: {
          description?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string;
          actor_id: string;
          table_name: string;
          record_id: string;
          action: string;
          before_data: Json | null;
          after_data: Json | null;
          reason: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id: string;
          actor_id: string;
          table_name: string;
          record_id: string;
          action: string;
          before_data?: Json | null;
          after_data?: Json | null;
          reason?: string | null;
        };
        Update: {
          [K: string]: never;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          id: string;
          created_at: string;
          masjid_id: string;
          donor_name: string;
          donor_phone: string | null;
          donor_email: string | null;
          amount: number;
          purpose: string | null;
          receipt_number: string;
          voided_at: string | null;
          void_reason: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          masjid_id: string;
          donor_name: string;
          donor_phone?: string | null;
          donor_email?: string | null;
          amount: number;
          purpose?: string | null;
          receipt_number: string;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Update: {
          donor_name?: string;
          donor_phone?: string | null;
          donor_email?: string | null;
          amount?: number;
          purpose?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      next_member_number: {
        Args: { p_masjid_id: string };
        Returns: string;
      };
      next_receipt_number: {
        Args: { p_masjid_id: string };
        Returns: string;
      };
      auth_role: {
        Args: Record<never, never>;
        Returns: string;
      };
      auth_masjid_id: {
        Args: Record<never, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      member_status: MemberStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Masjid = Database["public"]["Tables"]["masjids"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Program = Database["public"]["Tables"]["programs"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type Receipt = Database["public"]["Tables"]["receipts"]["Row"];
export type LedgerEntry = Database["public"]["Tables"]["ledger"]["Row"];
export type Donation = Database["public"]["Tables"]["donations"]["Row"];
