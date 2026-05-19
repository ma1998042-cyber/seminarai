CREATE TABLE `blog_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_blog_categories_org` ON `blog_categories` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `blog_categories_org_slug_unique` ON `blog_categories` (`organization_id`,`slug`);--> statement-breakpoint
CREATE TABLE `blog_post_categories` (
	`post_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`post_id`, `category_id`),
	FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_blog_post_categories_post` ON `blog_post_categories` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_blog_post_categories_category` ON `blog_post_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`body_html` text,
	`excerpt` text,
	`thumbnail_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`author_id` text,
	`meta_title` text,
	`meta_description` text,
	`og_image_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_blog_posts_org` ON `blog_posts` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_status` ON `blog_posts` (`organization_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_org_slug_unique` ON `blog_posts` (`organization_id`,`slug`);--> statement-breakpoint
CREATE TABLE `landing_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`body_html` text,
	`hero_image_url` text,
	`form_fields` text DEFAULT '[]' NOT NULL,
	`cta_text` text DEFAULT '申し込む' NOT NULL,
	`thank_you_message` text,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` text,
	`meta_title` text,
	`meta_description` text,
	`og_image_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_landing_pages_org` ON `landing_pages` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `landing_pages_slug_unique` ON `landing_pages` (`slug`);--> statement-breakpoint
CREATE TABLE `lp_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`landing_page_id` text NOT NULL,
	`customer_id` text,
	`data` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`landing_page_id`) REFERENCES `landing_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_lp_submissions_lp` ON `lp_submissions` (`landing_page_id`);--> statement-breakpoint
CREATE INDEX `idx_lp_submissions_customer` ON `lp_submissions` (`customer_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `reminder_subject` text;--> statement-breakpoint
ALTER TABLE `events` ADD `reminder_body` text;--> statement-breakpoint
ALTER TABLE `surveys` ADD `completion_email_enabled` integer DEFAULT false NOT NULL;