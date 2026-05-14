-- =============================================
-- SeminarFlow SaaS - Initial D1 (SQLite) Schema
-- =============================================

CREATE TABLE plans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  stripe_price_monthly TEXT,
  stripe_price_yearly TEXT,
  max_events INTEGER NOT NULL DEFAULT 1,
  max_customers INTEGER NOT NULL DEFAULT 100,
  max_monthly_emails INTEGER NOT NULL DEFAULT 500,
  max_surveys INTEGER NOT NULL DEFAULT 3,
  max_members INTEGER NOT NULL DEFAULT 1,
  features TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE organizations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  plan_id TEXT REFERENCES plans(id),
  stripe_customer_id TEXT UNIQUE,
  trial_ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE organization_members (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by TEXT,
  invited_at TEXT,
  joined_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  current_organization_id TEXT,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (current_organization_id) REFERENCES organizations(id)
);

CREATE TABLE events (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'seminar',
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  location TEXT,
  is_online INTEGER NOT NULL DEFAULT 0,
  online_url TEXT,
  capacity INTEGER,
  registration_count INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  custom_fields TEXT NOT NULL DEFAULT '[]',
  settings TEXT NOT NULL DEFAULT '{}',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT,
  source_event_id TEXT,
  custom_fields TEXT NOT NULL DEFAULT '{}',
  email_opt_in INTEGER NOT NULL DEFAULT 1,
  last_activity_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, email),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (source_event_id) REFERENCES events(id)
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  is_auto INTEGER NOT NULL DEFAULT 0,
  auto_rule TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, name),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE customer_tags (
  customer_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  added_by TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(customer_id, tag_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  customer_id TEXT,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  checked_in_at TEXT,
  UNIQUE(event_id, email),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE surveys (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  event_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  thank_you_message TEXT,
  redirect_url TEXT,
  settings TEXT NOT NULL DEFAULT '{}',
  response_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  published_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE survey_questions (
  id TEXT PRIMARY KEY NOT NULL,
  survey_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  question_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required INTEGER NOT NULL DEFAULT 0,
  options TEXT,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE TABLE survey_responses (
  id TEXT PRIMARY KEY NOT NULL,
  survey_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  customer_id TEXT,
  respondent_email TEXT,
  respondent_name TEXT,
  answers TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE email_campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  target_type TEXT NOT NULL DEFAULT 'all',
  target_tag_ids TEXT,
  target_customer_ids TEXT,
  scheduled_at TEXT,
  sent_at TEXT,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  bounce_count INTEGER NOT NULL DEFAULT 0,
  unsubscribe_count INTEGER NOT NULL DEFAULT 0,
  settings TEXT NOT NULL DEFAULT '{}',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE email_sends (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  customer_id TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  opened_at TEXT,
  clicked_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  action TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE billing_history (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  status TEXT NOT NULL,
  description TEXT,
  invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TEXT,
  period_end TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE invitations (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT,
  accepted_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, email),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE admin_users (
  id TEXT PRIMARY KEY NOT NULL,
  role TEXT NOT NULL DEFAULT 'support',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
CREATE INDEX idx_usage_logs_org_period ON usage_logs(organization_id, period_year, period_month);

-- =============================================
-- SEED DEFAULT PLANS
-- =============================================
INSERT INTO plans (id, name, display_name, price_monthly, price_yearly, max_events, max_customers, max_monthly_emails, max_surveys, max_members, features, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'free', 'Free', 0, 0, 1, 100, 500, 3, 1, '["基本的なイベント管理","アンケート作成","顧客管理100件"]', 0),
('00000000-0000-0000-0000-000000000002', 'basic', 'Basic', 3800, 38000, 10, 1000, 5000, 20, 5, '["イベント10件","顧客管理1,000件","メール配信5,000通/月","メンバー5名"]', 1),
('00000000-0000-0000-0000-000000000003', 'pro', 'Pro', 9800, 98000, -1, 10000, 50000, -1, 20, '["イベント無制限","顧客管理10,000件","メール配信50,000通/月","自動タグ付け","配信分析","メンバー20名"]', 2),
('00000000-0000-0000-0000-000000000004', 'enterprise', 'Enterprise', 0, 0, -1, -1, -1, -1, -1, '["顧客数・配信数は個別相談","独自ドメイン","専任サポート","API連携","SLA保証"]', 3);
