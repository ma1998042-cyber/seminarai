export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string
          name: string
          display_name: string
          price_monthly: number
          price_yearly: number
          stripe_price_monthly: string | null
          stripe_price_yearly: string | null
          max_events: number
          max_customers: number
          max_monthly_emails: number
          max_surveys: number
          max_members: number
          features: Json
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          website: string | null
          plan_id: string | null
          stripe_customer_id: string | null
          trial_ends_at: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
          invited_by: string | null
          invited_at: string | null
          joined_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organization_members']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          current_organization_id: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      events: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          event_type: string
          status: string
          start_date: string | null
          end_date: string | null
          location: string | null
          is_online: boolean
          online_url: string | null
          capacity: number | null
          registration_count: number
          thumbnail_url: string | null
          tags: string[]
          custom_fields: Json
          settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at' | 'registration_count'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      customers: {
        Row: {
          id: string
          organization_id: string
          email: string
          full_name: string | null
          phone: string | null
          company: string | null
          job_title: string | null
          notes: string | null
          status: string
          source: string | null
          source_event_id: string | null
          custom_fields: Json
          email_opt_in: boolean
          last_activity_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      tags: {
        Row: {
          id: string
          organization_id: string
          name: string
          color: string
          description: string | null
          is_auto: boolean
          auto_rule: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['tags']['Insert']>
      }
      customer_tags: {
        Row: {
          customer_id: string
          tag_id: string
          added_by: string | null
          added_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_tags']['Row'], 'added_at'>
        Update: Partial<Database['public']['Tables']['customer_tags']['Insert']>
      }
      surveys: {
        Row: {
          id: string
          organization_id: string
          event_id: string | null
          title: string
          description: string | null
          status: string
          is_anonymous: boolean
          thank_you_message: string | null
          redirect_url: string | null
          settings: Json
          response_count: number
          created_by: string | null
          published_at: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['surveys']['Row'], 'id' | 'created_at' | 'updated_at' | 'response_count'>
        Update: Partial<Database['public']['Tables']['surveys']['Insert']>
      }
      survey_questions: {
        Row: {
          id: string
          survey_id: string
          sort_order: number
          question_type: string
          title: string
          description: string | null
          is_required: boolean
          options: Json | null
          settings: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['survey_questions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['survey_questions']['Insert']>
      }
      survey_responses: {
        Row: {
          id: string
          survey_id: string
          organization_id: string
          customer_id: string | null
          respondent_email: string | null
          respondent_name: string | null
          answers: Json
          ip_address: string | null
          user_agent: string | null
          submitted_at: string
        }
        Insert: Omit<Database['public']['Tables']['survey_responses']['Row'], 'id' | 'submitted_at'>
        Update: Partial<Database['public']['Tables']['survey_responses']['Insert']>
      }
      email_campaigns: {
        Row: {
          id: string
          organization_id: string
          title: string
          subject: string
          preview_text: string | null
          body_html: string
          body_text: string | null
          status: string
          target_type: string
          target_tag_ids: string[] | null
          target_customer_ids: string[] | null
          scheduled_at: string | null
          sent_at: string | null
          total_recipients: number
          sent_count: number
          open_count: number
          click_count: number
          bounce_count: number
          unsubscribe_count: number
          settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['email_campaigns']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_recipients' | 'sent_count' | 'open_count' | 'click_count' | 'bounce_count' | 'unsubscribe_count'>
        Update: Partial<Database['public']['Tables']['email_campaigns']['Insert']>
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          plan_id: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          status: string
          billing_cycle: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      billing_history: {
        Row: {
          id: string
          organization_id: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          amount: number
          currency: string
          status: string
          description: string | null
          invoice_url: string | null
          invoice_pdf: string | null
          period_start: string | null
          period_end: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['billing_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['billing_history']['Insert']>
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: string
          token: string
          invited_by: string | null
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invitations']['Row'], 'id' | 'created_at' | 'token'>
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>
      }
      admin_users: {
        Row: {
          id: string
          role: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
      }
    }
    Views: {}
    Functions: {
      get_user_organization_ids: {
        Args: { user_id: string }
        Returns: string[]
      }
      is_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      get_user_org_role: {
        Args: { org_id: string; user_id: string }
        Returns: string
      }
    }
    Enums: {}
  }
}

// Convenience types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type CustomerTag = Database['public']['Tables']['customer_tags']['Row']
export type Survey = Database['public']['Tables']['surveys']['Row']
export type SurveyQuestion = Database['public']['Tables']['survey_questions']['Row']
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row']
export type EmailCampaign = Database['public']['Tables']['email_campaigns']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type BillingHistory = Database['public']['Tables']['billing_history']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type PlanName = 'free' | 'basic' | 'pro' | 'enterprise'
export type EventStatus = 'draft' | 'active' | 'closed' | 'archived'
export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived'
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'canceled'
export type CustomerStatus = 'active' | 'unsubscribed' | 'bounced' | 'blocked'
