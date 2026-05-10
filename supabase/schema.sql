-- =============================================
-- SeminarFlow SaaS - Full Database Schema
-- =============================================

-- Drop existing objects (clean slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TABLE IF EXISTS
  admin_users, invitations, billing_history, usage_logs,
  email_sends, step_campaign_enrollments, step_campaign_steps, step_campaigns,
  email_campaigns, email_templates,
  survey_responses, survey_questions, surveys,
  event_registrations, customer_tags, tags, customers, events,
  user_profiles, organization_members, subscriptions, organizations, plans
CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_user_organization_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_org_role(UUID, UUID) CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- PLANS (料金プラン)
-- =============================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                         -- free | basic | pro | enterprise
  display_name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,   -- 円 (税抜)
  price_yearly INTEGER NOT NULL DEFAULT 0,
  stripe_price_monthly TEXT,
  stripe_price_yearly TEXT,
  max_events INTEGER NOT NULL DEFAULT 1,      -- -1 = unlimited
  max_customers INTEGER NOT NULL DEFAULT 100,
  max_monthly_emails INTEGER NOT NULL DEFAULT 500,
  max_surveys INTEGER NOT NULL DEFAULT 3,
  max_members INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ORGANIZATIONS (組織)
-- =============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  plan_id UUID REFERENCES plans(id),
  stripe_customer_id TEXT UNIQUE,
  trial_ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS (サブスクリプション)
-- =============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | canceled | past_due | trialing | paused
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly | yearly
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ORGANIZATION_MEMBERS (組織メンバー)
-- =============================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer', -- owner | admin | editor | viewer
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- =============================================
-- USER_PROFILES (ユーザープロフィール)
-- =============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  current_organization_id UUID REFERENCES organizations(id),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- EVENTS (イベント/セミナー)
-- =============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'seminar', -- seminar | webinar | workshop | course | other
  status TEXT NOT NULL DEFAULT 'draft',        -- draft | active | closed | archived
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  online_url TEXT,
  capacity INTEGER,
  registration_count INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- CUSTOMERS (顧客)
-- =============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | unsubscribed | bounced | blocked
  source TEXT,                            -- event | manual | import | api
  source_event_id UUID REFERENCES events(id),
  custom_fields JSONB NOT NULL DEFAULT '{}',
  email_opt_in BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- =============================================
-- TAGS (タグ)
-- =============================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  is_auto BOOLEAN NOT NULL DEFAULT false,
  auto_rule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- =============================================
-- CUSTOMER_TAGS (顧客タグ中間テーブル)
-- =============================================
CREATE TABLE customer_tags (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(customer_id, tag_id)
);

-- =============================================
-- EVENT_REGISTRATIONS (イベント参加者)
-- =============================================
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'registered', -- registered | attended | absent | canceled
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  UNIQUE(event_id, email)
);

-- =============================================
-- SURVEYS (アンケート)
-- =============================================
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | closed | archived
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  thank_you_message TEXT,
  redirect_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  response_count INTEGER NOT NULL DEFAULT 0,
  payment_enabled BOOLEAN NOT NULL DEFAULT false,
  payment_amount INTEGER NOT NULL DEFAULT 0,  -- 円
  created_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- SURVEY_QUESTIONS (アンケート設問)
-- =============================================
CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  question_type TEXT NOT NULL, -- text | textarea | radio | checkbox | select | rating | number | email
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB,               -- radio / checkbox / select の選択肢
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- SURVEY_RESPONSES (アンケート回答)
-- =============================================
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  respondent_email TEXT,
  respondent_name TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  payment_status TEXT NOT NULL DEFAULT 'none', -- none | pending | paid | failed
  stripe_session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- EMAIL_TEMPLATES (メールテンプレート)
-- =============================================
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- EMAIL_CAMPAIGNS (メルマガ/一斉配信)
-- =============================================
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | canceled
  target_type TEXT NOT NULL DEFAULT 'all', -- all | tag | segment | manual
  target_tag_ids UUID[],
  target_customer_ids UUID[],
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  bounce_count INTEGER NOT NULL DEFAULT 0,
  unsubscribe_count INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- EMAIL_SENDS (個別メール送信ログ)
-- =============================================
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | delivered | opened | clicked | bounced | failed | unsubscribed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- STEP_CAMPAIGNS (ステップ配信シーケンス)
-- =============================================
CREATE TABLE step_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | active | paused | archived
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual | event_registration | tag_added
  trigger_event_id UUID REFERENCES events(id),
  trigger_tag_id UUID REFERENCES tags(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- STEP_CAMPAIGN_STEPS (ステップ)
-- =============================================
CREATE TABLE step_campaign_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_campaign_id UUID NOT NULL REFERENCES step_campaigns(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  name TEXT,
  delay_days INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(step_campaign_id, step_number)
);

-- =============================================
-- STEP_CAMPAIGN_ENROLLMENTS (顧客エンロール)
-- =============================================
CREATE TABLE step_campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_campaign_id UUID NOT NULL REFERENCES step_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | completed | canceled
  current_step INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(step_campaign_id, customer_id)
);

-- =============================================
-- USAGE_LOGS (利用ログ)
-- =============================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- event | customer | email | survey
  action TEXT NOT NULL,        -- created | deleted | sent
  quantity INTEGER NOT NULL DEFAULT 1,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- BILLING_HISTORY (請求履歴)
-- =============================================
CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,    -- 円
  currency TEXT NOT NULL DEFAULT 'jpy',
  status TEXT NOT NULL,       -- paid | open | void | uncollectible
  description TEXT,
  invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INVITATIONS (招待)
-- =============================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- =============================================
-- ADMIN_USERS (SaaS管理者)
-- =============================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'support', -- super_admin | admin | support
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_status ON events(organization_id, status);
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_email ON customers(organization_id, email);
CREATE INDEX idx_customer_tags_customer ON customer_tags(customer_id);
CREATE INDEX idx_customer_tags_tag ON customer_tags(tag_id);
CREATE INDEX idx_surveys_org ON surveys(organization_id);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_campaigns_org ON email_campaigns(organization_id);
CREATE INDEX idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_step_campaigns_org ON step_campaigns(organization_id);
CREATE INDEX idx_step_enrollments_customer ON step_campaign_enrollments(customer_id);
CREATE INDEX idx_usage_logs_org_period ON usage_logs(organization_id, period_year, period_month);

-- =============================================
-- SEED: DEFAULT PLANS
-- =============================================
INSERT INTO plans (name, display_name, price_monthly, price_yearly, max_events, max_customers, max_monthly_emails, max_surveys, max_members, features, sort_order) VALUES
('free',       'Free',       0,     0,      1,  100,   500,   3,  1,  '["基本的なイベント管理", "アンケート作成", "顧客管理100件"]', 0),
('basic',      'Basic',      3800,  38000,  10, 1000,  5000,  20, 5,  '["イベント10件", "顧客管理1,000件", "メール配信5,000通/月", "メンバー5名"]', 1),
('pro',        'Pro',        9800,  98000,  -1, 10000, 50000, -1, 20, '["イベント無制限", "顧客管理10,000件", "メール配信50,000通/月", "自動タグ付け", "配信分析", "メンバー20名"]', 2),
('enterprise', 'Enterprise', 0,     0,      -1, -1,    -1,    -1, -1, '["顧客数・配信数は個別相談", "独自ドメイン", "専任サポート", "API連携", "SLA保証"]', 3);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_id UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(organization_id)
  FROM organization_members
  WHERE organization_members.user_id = $1
    AND is_active = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = $1
      AND organization_members.user_id = $2
      AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_org_role(org_id UUID, user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members
  WHERE organization_id = $1
    AND organization_members.user_id = $2
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================
-- RLS POLICIES
-- =============================================

-- organizations
CREATE POLICY "users can view their organizations" ON organizations
  FOR SELECT USING (is_org_member(id, auth.uid()));
CREATE POLICY "owners can update their organization" ON organizations
  FOR UPDATE USING (get_user_org_role(id, auth.uid()) IN ('owner', 'admin'));
CREATE POLICY "authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- organization_members
CREATE POLICY "members can view org members" ON organization_members
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "owners can manage members" ON organization_members
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));
CREATE POLICY "users can see their own membership" ON organization_members
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users can insert themselves as member" ON organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- user_profiles
CREATE POLICY "users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- events
CREATE POLICY "org members can view events" ON events
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage events" ON events
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- customers
CREATE POLICY "org members can view customers" ON customers
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage customers" ON customers
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- tags
CREATE POLICY "org members can view tags" ON tags
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage tags" ON tags
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- customer_tags
CREATE POLICY "org members can view customer tags" ON customer_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND is_org_member(c.organization_id, auth.uid()))
  );
CREATE POLICY "editors can manage customer tags" ON customer_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND get_user_org_role(c.organization_id, auth.uid()) IN ('owner', 'admin', 'editor'))
  );

-- event_registrations
CREATE POLICY "org members can view registrations" ON event_registrations
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage registrations" ON event_registrations
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- surveys
CREATE POLICY "org members can view surveys" ON surveys
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage surveys" ON surveys
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- survey_questions
CREATE POLICY "org members can view survey questions" ON survey_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_id AND is_org_member(s.organization_id, auth.uid()))
  );
CREATE POLICY "editors can manage survey questions" ON survey_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_id AND get_user_org_role(s.organization_id, auth.uid()) IN ('owner', 'admin', 'editor'))
  );

-- survey_responses
CREATE POLICY "public can submit survey responses" ON survey_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.status = 'active')
  );
CREATE POLICY "org members can view survey responses" ON survey_responses
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "service can update survey responses" ON survey_responses
  FOR UPDATE USING (is_org_member(organization_id, auth.uid()));

-- email_templates
CREATE POLICY "org members can view templates" ON email_templates
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage templates" ON email_templates
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- email_campaigns
CREATE POLICY "org members can view campaigns" ON email_campaigns
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage campaigns" ON email_campaigns
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- email_sends
CREATE POLICY "org members can view email sends" ON email_sends
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage email sends" ON email_sends
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- step_campaigns
CREATE POLICY "org members can view step campaigns" ON step_campaigns
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage step campaigns" ON step_campaigns
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- step_campaign_steps
CREATE POLICY "org members can view steps" ON step_campaign_steps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM step_campaigns sc WHERE sc.id = step_campaign_id AND is_org_member(sc.organization_id, auth.uid()))
  );
CREATE POLICY "editors can manage steps" ON step_campaign_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM step_campaigns sc WHERE sc.id = step_campaign_id AND get_user_org_role(sc.organization_id, auth.uid()) IN ('owner', 'admin', 'editor'))
  );

-- step_campaign_enrollments
CREATE POLICY "org members can view enrollments" ON step_campaign_enrollments
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY "editors can manage enrollments" ON step_campaign_enrollments
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin', 'editor'));

-- usage_logs
CREATE POLICY "owners can view usage logs" ON usage_logs
  FOR SELECT USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));

-- billing_history
CREATE POLICY "owners can view billing" ON billing_history
  FOR SELECT USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));

-- subscriptions
CREATE POLICY "owners can view subscriptions" ON subscriptions
  FOR SELECT USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));

-- invitations
CREATE POLICY "org owners can manage invitations" ON invitations
  FOR ALL USING (get_user_org_role(organization_id, auth.uid()) IN ('owner', 'admin'));
CREATE POLICY "invited users can view their invitation" ON invitations
  FOR SELECT USING (email = auth.email());

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at               BEFORE UPDATE ON plans               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_organizations_updated_at       BEFORE UPDATE ON organizations       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at       BEFORE UPDATE ON subscriptions       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_org_members_updated_at         BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at       BEFORE UPDATE ON user_profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at              BEFORE UPDATE ON events              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at           BEFORE UPDATE ON customers           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_surveys_updated_at             BEFORE UPDATE ON surveys             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_email_templates_updated_at     BEFORE UPDATE ON email_templates     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_campaigns_updated_at           BEFORE UPDATE ON email_campaigns     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_step_campaigns_updated_at      BEFORE UPDATE ON step_campaigns      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_step_campaign_steps_updated_at BEFORE UPDATE ON step_campaign_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Backfill profiles for users created before the trigger was set up
INSERT INTO user_profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;
