import { sqliteTable, text, integer, uniqueIndex, index, primaryKey } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// =============================================
// PLANS (料金プラン)
// =============================================
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  priceMonthly: integer("price_monthly").notNull().default(0),
  priceYearly: integer("price_yearly").notNull().default(0),
  stripePriceMonthly: text("stripe_price_monthly"),
  stripePriceYearly: text("stripe_price_yearly"),
  maxEvents: integer("max_events").notNull().default(1),
  maxCustomers: integer("max_customers").notNull().default(100),
  maxMonthlyEmails: integer("max_monthly_emails").notNull().default(500),
  maxSurveys: integer("max_surveys").notNull().default(3),
  maxMembers: integer("max_members").notNull().default(1),
  features: text("features", { mode: "json" }).notNull().$type<string[]>().default([]),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================
// ORGANIZATIONS (組織)
// =============================================
export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  website: text("website"),
  planId: text("plan_id").references(() => plans.id),
  stripeCustomerId: text("stripe_customer_id").unique(),
  trialEndsAt: text("trial_ends_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  settings: text("settings", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================
// SUBSCRIPTIONS (サブスクリプション)
// =============================================
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plans.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),
  status: text("status").notNull().default("active"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  canceledAt: text("canceled_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================
// ORGANIZATION_MEMBERS (組織メンバー)
// =============================================
export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("viewer"),
  invitedBy: text("invited_by"),
  invitedAt: text("invited_at"),
  joinedAt: text("joined_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("org_members_org_user_unique").on(table.organizationId, table.userId),
]);

// =============================================
// USER_PROFILES (ユーザープロフィール)
// =============================================
export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  currentOrganizationId: text("current_organization_id").references(() => organizations.id),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================
// EVENTS (イベント/セミナー)
// =============================================
export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().default("seminar"),
  status: text("status").notNull().default("draft"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  location: text("location"),
  isOnline: integer("is_online", { mode: "boolean" }).notNull().default(false),
  onlineUrl: text("online_url"),
  capacity: integer("capacity"),
  showRemainingCapacity: integer("show_remaining_capacity").notNull().default(0),
  participationRequirements: text("participation_requirements"),
  recommendedFor: text("recommended_for"),
  participationBenefits: text("participation_benefits"),
  registrationDeadline: text("registration_deadline"),
  registrationCount: integer("registration_count").notNull().default(0),
  visibility: text("visibility").notNull().default("draft"),
  thumbnailUrl: text("thumbnail_url"),
  imageUrls: text("image_urls", { mode: "json" }).$type<string[]>().default([]),
  reminderEnabled: integer("reminder_enabled").notNull().default(0),
  reminderDays: text("reminder_days").notNull().default('[1,3]'),
  reminderSubject: text('reminder_subject'),
  reminderBody: text('reminder_body'),
  tags: text("tags", { mode: "json" }).notNull().$type<string[]>().default([]),
  customFields: text("custom_fields", { mode: "json" }).notNull().$type<unknown[]>().default([]),
  settings: text("settings", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({}),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_events_org").on(table.organizationId),
  index("idx_events_status").on(table.organizationId, table.status),
  index("idx_events_visibility").on(table.organizationId, table.visibility),
]);

// =============================================
// CUSTOMER_STATUSES (顧客ステータス/習熟度)
// =============================================
export const customerStatuses = sqliteTable("customer_statuses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_customer_statuses_org").on(table.organizationId),
  uniqueIndex("customer_statuses_org_name_unique").on(table.organizationId, table.name),
]);

// =============================================
// CUSTOMERS (顧客)
// =============================================
export const customers = sqliteTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  statusId: text("status_id").references(() => customerStatuses.id),
  source: text("source"),
  sourceEventId: text("source_event_id").references(() => events.id),
  customFields: text("custom_fields", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({}),
  emailOptIn: integer("email_opt_in", { mode: "boolean" }).notNull().default(true),
  lastActivityAt: text("last_activity_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("customers_org_email_unique").on(table.organizationId, table.email),
  index("idx_customers_org").on(table.organizationId),
]);

// =============================================
// TAGS (タグ)
// =============================================
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),
  isAuto: integer("is_auto", { mode: "boolean" }).notNull().default(false),
  autoRule: text("auto_rule", { mode: "json" }).$type<Record<string, unknown> | null>(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("tags_org_name_unique").on(table.organizationId, table.name),
]);

// =============================================
// CUSTOMER_TAGS (顧客タグ中間テーブル)
// =============================================
export const customerTags = sqliteTable("customer_tags", {
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  addedBy: text("added_by"),
  addedAt: text("added_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  primaryKey({ columns: [table.customerId, table.tagId] }),
  index("idx_customer_tags_customer").on(table.customerId),
  index("idx_customer_tags_tag").on(table.tagId),
]);

// =============================================
// EVENT_REGISTRATIONS (イベント参加者)
// =============================================
export const eventRegistrations = sqliteTable("event_registrations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name"),
  status: text("status").notNull().default("registered"),
  registeredAt: text("registered_at").notNull().default(sql`(datetime('now'))`),
  checkedInAt: text("checked_in_at"),
  notificationConsent: integer("notification_consent").notNull().default(0),
}, (table) => [
  uniqueIndex("event_reg_event_email_unique").on(table.eventId, table.email),
]);

// =============================================
// SURVEYS (アンケート)
// =============================================
export const surveys = sqliteTable("surveys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId: text("event_id").references(() => events.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  category: text("category").notNull().default("general"),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
  thankYouMessage: text("thank_you_message"),
  redirectUrl: text("redirect_url"),
  settings: text("settings", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({}),
  completionEmailEnabled: integer("completion_email_enabled", { mode: "boolean" }).notNull().default(false),
  completionEmailSubject: text("completion_email_subject"),
  completionEmailBody: text("completion_email_body"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  paymentEnabled: integer("payment_enabled", { mode: "boolean" }).notNull().default(false),
  paymentAmount: integer("payment_amount"),
  responseCount: integer("response_count").notNull().default(0),
  createdBy: text("created_by"),
  publishedAt: text("published_at"),
  closedAt: text("closed_at"),
  deadline: integer("deadline"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_surveys_org").on(table.organizationId),
]);

// =============================================
// SURVEY_QUESTIONS (アンケート設問)
// =============================================
export const surveyQuestions = sqliteTable("survey_questions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  questionType: text("question_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
  options: text("options", { mode: "json" }).$type<unknown[] | null>(),
  settings: text("settings", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================
// SURVEY_RESPONSES (アンケート回答)
// =============================================
export const surveyResponses = sqliteTable("survey_responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  respondentEmail: text("respondent_email"),
  respondentName: text("respondent_name"),
  answers: text("answers", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({}),
  paymentStatus: text("payment_status"),
  stripeSessionId: text("stripe_session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submittedAt: text("submitted_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_survey_responses_survey").on(table.surveyId),
]);

// =============================================
// EMAIL_CAMPAIGNS (メルマガ/メール配信)
// =============================================
export const emailCampaigns = sqliteTable("email_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  format: text("format").notNull().default("html"),
  status: text("status").notNull().default("draft"),
  targetType: text("target_type").notNull().default("all"),
  targetTagIds: text("target_tag_ids", { mode: "json" }).$type<string[] | null>(),
  targetSurveyId: text("target_survey_id").references(() => surveys.id),
  targetCustomerIds: text("target_customer_ids", { mode: "json" }).$type<string[] | null>(),
  scheduledAt: text("scheduled_at"),
  sentAt: text("sent_at"),
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  bounceCount: integer("bounce_count").notNull().default(0),
  unsubscribeCount: integer("unsubscribe_count").notNull().default(0),
  settings: text("settings", { mode: "json" }).notNull().$type<Record<string, unknown>>().default({}),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_campaigns_org").on(table.organizationId),
]);

// =============================================
// EMAIL_SENDS (個別メール送信ログ)
// =============================================
export const emailSends = sqliteTable("email_sends", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text("campaign_id").notNull().references(() => emailCampaigns.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: text("sent_at"),
  openedAt: text("opened_at"),
  clickedAt: text("clicked_at"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_email_sends_campaign").on(table.campaignId),
]);

// =============================================
// EMAIL_TEMPLATES (メールテンプレート)
// =============================================
export const emailTemplates = sqliteTable("email_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  bodyHtml: text("body_html").notNull(),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_email_templates_org").on(table.organizationId),
]);

// =============================================
// STEP_CAMPAIGNS (ステップ配信)
// =============================================
export const stepCampaigns = sqliteTable("step_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  triggerType: text("trigger_type").notNull().default("manual"),
  triggerEventId: text("trigger_event_id"),
  triggerTagId: text("trigger_tag_id"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_step_campaigns_org").on(table.organizationId),
]);

// =============================================
// STEP_CAMPAIGN_STEPS (ステップ配信のステップ)
// =============================================
export const stepCampaignSteps = sqliteTable("step_campaign_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stepCampaignId: text("step_campaign_id").notNull().references(() => stepCampaigns.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull().default(1),
  name: text("name"),
  delayDays: integer("delay_days").notNull().default(0),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  bodyHtml: text("body_html").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_step_campaign_steps_campaign").on(table.stepCampaignId),
]);

// =============================================
// STEP_CAMPAIGN_ENROLLMENTS (ステップ配信の登録者)
// =============================================
export const stepCampaignEnrollments = sqliteTable("step_campaign_enrollments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stepCampaignId: text("step_campaign_id").notNull().references(() => stepCampaigns.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  currentStep: integer("current_step").notNull().default(0),
  enrolledAt: text("enrolled_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("step_enrollments_campaign_customer_unique").on(table.stepCampaignId, table.customerId),
]);

// =============================================
// USAGE_LOGS (利用ログ)
// =============================================
export const usageLogs = sqliteTable("usage_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(),
  action: text("action").notNull(),
  quantity: integer("quantity").notNull().default(1),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_usage_logs_org_period").on(table.organizationId, table.periodYear, table.periodMonth),
]);

// =============================================
// BILLING_HISTORY (請求履歴)
// =============================================
export const billingHistory = sqliteTable("billing_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("jpy"),
  status: text("status").notNull(),
  description: text("description"),
  invoiceUrl: text("invoice_url"),
  invoicePdf: text("invoice_pdf"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================
// INVITATIONS (招待)
// =============================================
export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"),
  token: text("token").notNull().unique().$defaultFn(() => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }),
  invitedBy: text("invited_by"),
  acceptedAt: text("accepted_at"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("invitations_org_email_unique").on(table.organizationId, table.email),
]);

// =============================================
// BANNERS (バナー)
// =============================================
export const banners = sqliteTable("banners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_banners_org").on(table.organizationId),
]);

// =============================================
// LANDING_PAGES (ランディングページ)
// =============================================
export const landingPages = sqliteTable("landing_pages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  bodyHtml: text("body_html"),
  heroImageUrl: text("hero_image_url"),
  formFields: text("form_fields", { mode: "json" }).notNull().$type<{ name: string; label: string; type: string; required: boolean; options?: string[] }[]>().default([]),
  ctaText: text("cta_text").notNull().default("申し込む"),
  thankYouMessage: text("thank_you_message"),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  publishedAt: text("published_at"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImageUrl: text("og_image_url"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_landing_pages_org").on(table.organizationId),
  uniqueIndex("landing_pages_slug_unique").on(table.slug),
]);

// =============================================
// LP_SUBMISSIONS (LP申し込み)
// =============================================
export const lpSubmissions = sqliteTable("lp_submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  landingPageId: text("landing_page_id").notNull().references(() => landingPages.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  data: text("data", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_lp_submissions_lp").on(table.landingPageId),
  index("idx_lp_submissions_customer").on(table.customerId),
]);

// =============================================
// BLOG_CATEGORIES (ブログカテゴリ)
// =============================================
export const blogCategories = sqliteTable("blog_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_blog_categories_org").on(table.organizationId),
  uniqueIndex("blog_categories_org_slug_unique").on(table.organizationId, table.slug),
]);

// =============================================
// BLOG_POSTS (ブログ記事)
// =============================================
export const blogPosts = sqliteTable("blog_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  bodyHtml: text("body_html"),
  excerpt: text("excerpt"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("draft"),
  publishedAt: text("published_at"),
  authorId: text("author_id").references(() => userProfiles.id, { onDelete: "set null" }),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImageUrl: text("og_image_url"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_blog_posts_org").on(table.organizationId),
  index("idx_blog_posts_status").on(table.organizationId, table.status),
  uniqueIndex("blog_posts_org_slug_unique").on(table.organizationId, table.slug),
]);

// =============================================
// BLOG_POST_CATEGORIES (記事カテゴリ中間テーブル)
// =============================================
export const blogPostCategories = sqliteTable("blog_post_categories", {
  postId: text("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => blogCategories.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.postId, table.categoryId] }),
  index("idx_blog_post_categories_post").on(table.postId),
  index("idx_blog_post_categories_category").on(table.categoryId),
]);

// =============================================
// ADMIN_USERS (SaaS管理者)
// =============================================
export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  role: text("role").notNull().default("support"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================
// RELATIONS
// =============================================
export const plansRelations = relations(plans, ({ many }) => ({
  organizations: many(organizations),
  subscriptions: many(subscriptions),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  plan: one(plans, { fields: [organizations.planId], references: [plans.id] }),
  members: many(organizationMembers),
  subscriptions: many(subscriptions),
  events: many(events),
  customers: many(customers),
  tags: many(tags),
  surveys: many(surveys),
  emailCampaigns: many(emailCampaigns),
  billingHistory: many(billingHistory),
  invitations: many(invitations),
  usageLogs: many(usageLogs),
  banners: many(banners),
  customerStatuses: many(customerStatuses),
  landingPages: many(landingPages),
  blogPosts: many(blogPosts),
  blogCategories: many(blogCategories),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, { fields: [subscriptions.organizationId], references: [organizations.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  currentOrganization: one(organizations, { fields: [userProfiles.currentOrganizationId], references: [organizations.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, { fields: [events.organizationId], references: [organizations.id] }),
  registrations: many(eventRegistrations),
  surveys: many(surveys),
}));

export const customerStatusesRelations = relations(customerStatuses, ({ one, many }) => ({
  organization: one(organizations, { fields: [customerStatuses.organizationId], references: [organizations.id] }),
  customers: many(customers),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, { fields: [customers.organizationId], references: [organizations.id] }),
  sourceEvent: one(events, { fields: [customers.sourceEventId], references: [events.id] }),
  customerStatus: one(customerStatuses, { fields: [customers.statusId], references: [customerStatuses.id] }),
  customerTags: many(customerTags),
  eventRegistrations: many(eventRegistrations),
  surveyResponses: many(surveyResponses),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  organization: one(organizations, { fields: [tags.organizationId], references: [organizations.id] }),
  customerTags: many(customerTags),
}));

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, { fields: [customerTags.customerId], references: [customers.id] }),
  tag: one(tags, { fields: [customerTags.tagId], references: [tags.id] }),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, { fields: [eventRegistrations.eventId], references: [events.id] }),
  customer: one(customers, { fields: [eventRegistrations.customerId], references: [customers.id] }),
  organization: one(organizations, { fields: [eventRegistrations.organizationId], references: [organizations.id] }),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  organization: one(organizations, { fields: [surveys.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [surveys.eventId], references: [events.id] }),
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one }) => ({
  survey: one(surveys, { fields: [surveyQuestions.surveyId], references: [surveys.id] }),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(surveys, { fields: [surveyResponses.surveyId], references: [surveys.id] }),
  organization: one(organizations, { fields: [surveyResponses.organizationId], references: [organizations.id] }),
  customer: one(customers, { fields: [surveyResponses.customerId], references: [customers.id] }),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one, many }) => ({
  organization: one(organizations, { fields: [emailCampaigns.organizationId], references: [organizations.id] }),
  sends: many(emailSends),
}));

export const emailSendsRelations = relations(emailSends, ({ one }) => ({
  campaign: one(emailCampaigns, { fields: [emailSends.campaignId], references: [emailCampaigns.id] }),
  organization: one(organizations, { fields: [emailSends.organizationId], references: [organizations.id] }),
  customer: one(customers, { fields: [emailSends.customerId], references: [customers.id] }),
}));

export const billingHistoryRelations = relations(billingHistory, ({ one }) => ({
  organization: one(organizations, { fields: [billingHistory.organizationId], references: [organizations.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, { fields: [invitations.organizationId], references: [organizations.id] }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  organization: one(organizations, { fields: [usageLogs.organizationId], references: [organizations.id] }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  organization: one(organizations, { fields: [emailTemplates.organizationId], references: [organizations.id] }),
}));

export const stepCampaignsRelations = relations(stepCampaigns, ({ one, many }) => ({
  organization: one(organizations, { fields: [stepCampaigns.organizationId], references: [organizations.id] }),
  steps: many(stepCampaignSteps),
  enrollments: many(stepCampaignEnrollments),
}));

export const stepCampaignStepsRelations = relations(stepCampaignSteps, ({ one }) => ({
  stepCampaign: one(stepCampaigns, { fields: [stepCampaignSteps.stepCampaignId], references: [stepCampaigns.id] }),
}));

export const stepCampaignEnrollmentsRelations = relations(stepCampaignEnrollments, ({ one }) => ({
  stepCampaign: one(stepCampaigns, { fields: [stepCampaignEnrollments.stepCampaignId], references: [stepCampaigns.id] }),
  customer: one(customers, { fields: [stepCampaignEnrollments.customerId], references: [customers.id] }),
  organization: one(organizations, { fields: [stepCampaignEnrollments.organizationId], references: [organizations.id] }),
}));

export const bannersRelations = relations(banners, ({ one }) => ({
  organization: one(organizations, { fields: [banners.organizationId], references: [organizations.id] }),
}));

export const landingPagesRelations = relations(landingPages, ({ one, many }) => ({
  organization: one(organizations, { fields: [landingPages.organizationId], references: [organizations.id] }),
  submissions: many(lpSubmissions),
}));

export const lpSubmissionsRelations = relations(lpSubmissions, ({ one }) => ({
  landingPage: one(landingPages, { fields: [lpSubmissions.landingPageId], references: [landingPages.id] }),
  customer: one(customers, { fields: [lpSubmissions.customerId], references: [customers.id] }),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ one, many }) => ({
  organization: one(organizations, { fields: [blogCategories.organizationId], references: [organizations.id] }),
  postCategories: many(blogPostCategories),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  organization: one(organizations, { fields: [blogPosts.organizationId], references: [organizations.id] }),
  author: one(userProfiles, { fields: [blogPosts.authorId], references: [userProfiles.id] }),
  postCategories: many(blogPostCategories),
}));

export const blogPostCategoriesRelations = relations(blogPostCategories, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostCategories.postId], references: [blogPosts.id] }),
  category: one(blogCategories, { fields: [blogPostCategories.categoryId], references: [blogCategories.id] }),
}));
