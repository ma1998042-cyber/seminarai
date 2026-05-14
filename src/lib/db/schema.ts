import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core'
import type { AdapterAccountType } from 'next-auth/adapters'

// =============================================
// AUTH.JS TABLES (next-auth required)
// =============================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp_ms' }),
  image: text('image'),
  password: text('password'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
)

export const sessions = sqliteTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
})

export const verificationTokens = sqliteTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
)

// =============================================
// PLANS（料金プラン）
// =============================================

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  priceMonthly: integer('price_monthly').notNull().default(0),
  priceYearly: integer('price_yearly').notNull().default(0),
  stripePriceMonthly: text('stripe_price_monthly'),
  stripePriceYearly: text('stripe_price_yearly'),
  maxEvents: integer('max_events').notNull().default(1),
  maxCustomers: integer('max_customers').notNull().default(100),
  maxMonthlyEmails: integer('max_monthly_emails').notNull().default(500),
  maxSurveys: integer('max_surveys').notNull().default(3),
  maxMembers: integer('max_members').notNull().default(1),
  features: text('features').notNull().default('[]'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// ORGANIZATIONS（組織）
// =============================================

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  planId: text('plan_id').references(() => plans.id),
  stripeCustomerId: text('stripe_customer_id').unique(),
  trialEndsAt: text('trial_ends_at'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  settings: text('settings').notNull().default('{}'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// SUBSCRIPTIONS（サブスクリプション）
// =============================================

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull().references(() => plans.id),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  status: text('status').notNull().default('active'),
  billingCycle: text('billing_cycle').notNull().default('monthly'),
  currentPeriodStart: text('current_period_start'),
  currentPeriodEnd: text('current_period_end'),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
  canceledAt: text('canceled_at'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// ORGANIZATION_MEMBERS（組織メンバー）
// =============================================

export const organizationMembers = sqliteTable(
  'organization_members',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('viewer'),
    invitedBy: text('invited_by').references(() => users.id),
    invitedAt: text('invited_at'),
    joinedAt: text('joined_at'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('org_member_unique').on(t.organizationId, t.userId)]
)

// =============================================
// USER_PROFILES（ユーザープロフィール）
// =============================================

export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  currentOrganizationId: text('current_organization_id').references(() => organizations.id),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// EVENTS（イベント/セミナー）
// =============================================

export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type').notNull().default('seminar'),
  status: text('status').notNull().default('draft'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  location: text('location'),
  isOnline: integer('is_online', { mode: 'boolean' }).notNull().default(false),
  onlineUrl: text('online_url'),
  capacity: integer('capacity'),
  registrationCount: integer('registration_count').notNull().default(0),
  thumbnailUrl: text('thumbnail_url'),
  tags: text('tags').notNull().default('[]'),
  customFields: text('custom_fields').notNull().default('[]'),
  settings: text('settings').notNull().default('{}'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (t) => [index('idx_events_org').on(t.organizationId)])

// =============================================
// CUSTOMERS（顧客）
// =============================================

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    fullName: text('full_name'),
    phone: text('phone'),
    company: text('company'),
    jobTitle: text('job_title'),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
    source: text('source'),
    sourceEventId: text('source_event_id').references(() => events.id),
    customFields: text('custom_fields').notNull().default('{}'),
    emailOptIn: integer('email_opt_in', { mode: 'boolean' }).notNull().default(true),
    lastActivityAt: text('last_activity_at'),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('customer_org_email').on(t.organizationId, t.email),
    index('idx_customers_org').on(t.organizationId),
  ]
)

// =============================================
// TAGS（タグ）
// =============================================

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#6366f1'),
    description: text('description'),
    isAuto: integer('is_auto', { mode: 'boolean' }).notNull().default(false),
    autoRule: text('auto_rule'),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('tag_org_name').on(t.organizationId, t.name)]
)

// =============================================
// CUSTOMER_TAGS（顧客タグ中間テーブル）
// =============================================

export const customerTags = sqliteTable(
  'customer_tags',
  {
    customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    addedBy: text('added_by').references(() => users.id),
    addedAt: text('added_at').$defaultFn(() => new Date().toISOString()),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.tagId] })]
)

// =============================================
// EVENT_REGISTRATIONS（イベント参加者）
// =============================================

export const eventRegistrations = sqliteTable(
  'event_registrations',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').references(() => customers.id),
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    fullName: text('full_name'),
    status: text('status').notNull().default('registered'),
    registeredAt: text('registered_at').$defaultFn(() => new Date().toISOString()),
    checkedInAt: text('checked_in_at'),
  },
  (t) => [uniqueIndex('reg_event_email').on(t.eventId, t.email)]
)

// =============================================
// SURVEYS（アンケート）
// =============================================

export const surveys = sqliteTable('surveys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  eventId: text('event_id').references(() => events.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
  thankYouMessage: text('thank_you_message'),
  redirectUrl: text('redirect_url'),
  settings: text('settings').notNull().default('{}'),
  responseCount: integer('response_count').notNull().default(0),
  paymentEnabled: integer('payment_enabled', { mode: 'boolean' }).notNull().default(false),
  paymentAmount: integer('payment_amount').notNull().default(0),
  createdBy: text('created_by').references(() => users.id),
  publishedAt: text('published_at'),
  closedAt: text('closed_at'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// SURVEY_QUESTIONS（アンケート設問）
// =============================================

export const surveyQuestions = sqliteTable('survey_questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  questionType: text('question_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  options: text('options'),
  settings: text('settings').notNull().default('{}'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// SURVEY_RESPONSES（アンケート回答）
// =============================================

export const surveyResponses = sqliteTable('survey_responses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id),
  respondentEmail: text('respondent_email'),
  respondentName: text('respondent_name'),
  answers: text('answers').notNull().default('{}'),
  paymentStatus: text('payment_status').notNull().default('none'),
  stripeSessionId: text('stripe_session_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  submittedAt: text('submitted_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// EMAIL_TEMPLATES（メールテンプレート）
// =============================================

export const emailTemplates = sqliteTable('email_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  previewText: text('preview_text'),
  bodyHtml: text('body_html').notNull(),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// EMAIL_CAMPAIGNS（メルマガ/一斉配信）
// =============================================

export const emailCampaigns = sqliteTable('email_campaigns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  previewText: text('preview_text'),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text'),
  status: text('status').notNull().default('draft'),
  targetType: text('target_type').notNull().default('all'),
  targetTagIds: text('target_tag_ids').notNull().default('[]'),
  targetCustomerIds: text('target_customer_ids').notNull().default('[]'),
  scheduledAt: text('scheduled_at'),
  sentAt: text('sent_at'),
  totalRecipients: integer('total_recipients').notNull().default(0),
  sentCount: integer('sent_count').notNull().default(0),
  openCount: integer('open_count').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  bounceCount: integer('bounce_count').notNull().default(0),
  unsubscribeCount: integer('unsubscribe_count').notNull().default(0),
  settings: text('settings').notNull().default('{}'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// EMAIL_SENDS（個別メール送信ログ）
// =============================================

export const emailSends = sqliteTable('email_sends', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text('campaign_id').notNull().references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id),
  email: text('email').notNull(),
  status: text('status').notNull().default('pending'),
  sentAt: text('sent_at'),
  openedAt: text('opened_at'),
  clickedAt: text('clicked_at'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// STEP_CAMPAIGNS（ステップ配信シーケンス）
// =============================================

export const stepCampaigns = sqliteTable('step_campaigns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'),
  triggerType: text('trigger_type').notNull().default('manual'),
  triggerEventId: text('trigger_event_id').references(() => events.id),
  triggerTagId: text('trigger_tag_id').references(() => tags.id),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// STEP_CAMPAIGN_STEPS（ステップ）
// =============================================

export const stepCampaignSteps = sqliteTable(
  'step_campaign_steps',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    stepCampaignId: text('step_campaign_id').notNull().references(() => stepCampaigns.id, { onDelete: 'cascade' }),
    stepNumber: integer('step_number').notNull(),
    name: text('name'),
    delayDays: integer('delay_days').notNull().default(0),
    subject: text('subject').notNull(),
    previewText: text('preview_text'),
    bodyHtml: text('body_html').notNull(),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('step_campaign_step_number').on(t.stepCampaignId, t.stepNumber)]
)

// =============================================
// STEP_CAMPAIGN_ENROLLMENTS（顧客エンロール）
// =============================================

export const stepCampaignEnrollments = sqliteTable(
  'step_campaign_enrollments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    stepCampaignId: text('step_campaign_id').notNull().references(() => stepCampaigns.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    currentStep: integer('current_step').notNull().default(0),
    enrolledAt: text('enrolled_at').$defaultFn(() => new Date().toISOString()),
    nextSendAt: text('next_send_at'),
    completedAt: text('completed_at'),
  },
  (t) => [uniqueIndex('enrollment_campaign_customer').on(t.stepCampaignId, t.customerId)]
)

// =============================================
// USAGE_LOGS（利用ログ）
// =============================================

export const usageLogs = sqliteTable('usage_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  resourceType: text('resource_type').notNull(),
  action: text('action').notNull(),
  quantity: integer('quantity').notNull().default(1),
  periodYear: integer('period_year').notNull(),
  periodMonth: integer('period_month').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// BILLING_HISTORY（請求履歴）
// =============================================

export const billingHistory = sqliteTable('billing_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  stripeInvoiceId: text('stripe_invoice_id').unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('jpy'),
  status: text('status').notNull(),
  description: text('description'),
  invoiceUrl: text('invoice_url'),
  invoicePdf: text('invoice_pdf'),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// INVITATIONS（招待）
// =============================================

export const invitations = sqliteTable(
  'invitations',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('viewer'),
    token: text('token').notNull().unique().$defaultFn(() => crypto.randomUUID()),
    invitedBy: text('invited_by').references(() => users.id),
    acceptedAt: text('accepted_at'),
    expiresAt: text('expires_at').notNull().$defaultFn(() => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      return d.toISOString()
    }),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('invitation_org_email').on(t.organizationId, t.email)]
)

// =============================================
// ADMIN_USERS（SaaS管理者）
// =============================================

export const adminUsers = sqliteTable('admin_users', {
  id: text('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('support'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

// =============================================
// TYPE EXPORTS
// =============================================

export type User = typeof users.$inferSelect
export type Plan = typeof plans.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type OrganizationMember = typeof organizationMembers.$inferSelect
export type UserProfile = typeof userProfiles.$inferSelect
export type Event = typeof events.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Tag = typeof tags.$inferSelect
export type Survey = typeof surveys.$inferSelect
export type SurveyQuestion = typeof surveyQuestions.$inferSelect
export type SurveyResponse = typeof surveyResponses.$inferSelect
export type EmailTemplate = typeof emailTemplates.$inferSelect
export type EmailCampaign = typeof emailCampaigns.$inferSelect
export type StepCampaign = typeof stepCampaigns.$inferSelect
