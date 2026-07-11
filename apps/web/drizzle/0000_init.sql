CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`entity_id` text NOT NULL,
	`work_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_user_created_idx` ON `activities` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`parent_id` text,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_entity_idx` ON `comments` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `fic_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`fic_id` text NOT NULL,
	`idx` integer NOT NULL,
	`title` text,
	`body` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`fic_id`) REFERENCES `fics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chapters_fic_idx_unique` ON `fic_chapters` (`fic_id`,`idx`);--> statement-breakpoint
CREATE TABLE `fic_subscriptions` (
	`user_id` text NOT NULL,
	`fic_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `fic_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fic_id`) REFERENCES `fics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fic_tags` (
	`fic_id` text NOT NULL,
	`kind` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`fic_id`, `kind`, `tag`),
	FOREIGN KEY (`fic_id`) REFERENCES `fics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fic_tags_tag_idx` ON `fic_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `fics` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`work_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text,
	`type` text NOT NULL,
	`rating` text DEFAULT 'general' NOT NULL,
	`canon` text DEFAULT 'canon-divergent' NOT NULL,
	`is_complete` integer DEFAULT false NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`chapter_count` integer DEFAULT 0 NOT NULL,
	`kudos_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`inspired_by_fic_id` text,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fics_work_idx` ON `fics` (`work_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `fics_user_idx` ON `fics` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `fics_slug_unique` ON `fics` (`slug`);--> statement-breakpoint
CREATE INDEX `fics_inspired_idx` ON `fics` (`inspired_by_fic_id`);--> statement-breakpoint
CREATE TABLE `flags` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flags_reporter_entity_unique` ON `flags` (`reporter_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `flags_status_idx` ON `flags` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `follows` (
	`follower_id` text NOT NULL,
	`following_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`follower_id`, `following_id`),
	FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `follows_following_idx` ON `follows` (`following_id`);--> statement-breakpoint
CREATE TABLE `kudos` (
	`user_id` text NOT NULL,
	`fic_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `fic_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fic_id`) REFERENCES `fics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `entity_type`, `entity_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `likes_entity_idx` ON `likes` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`work_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`note` text,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `list_items_unique` ON `list_items` (`list_id`,`work_id`);--> statement-breakpoint
CREATE INDEX `list_items_list_idx` ON `list_items` (`list_id`,`position`);--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`is_ranked` integer DEFAULT false NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lists_user_idx` ON `lists` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `lists_slug_unique` ON `lists` (`slug`);--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`work_id` text NOT NULL,
	`rating` integer,
	`reaction` text,
	`review_body` text,
	`has_spoilers` integer DEFAULT false NOT NULL,
	`logged_on` integer DEFAULT (unixepoch()) NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `logs_user_idx` ON `logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `logs_work_idx` ON `logs` (`work_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `logs_user_work_unique` ON `logs` (`user_id`,`work_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`actor_id` text,
	`entity_type` text,
	`entity_id` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`is_read`,`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`work_id` text NOT NULL,
	`body` text NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reactions_work_idx` ON `reactions` (`work_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `shelf_items` (
	`shelf_id` text NOT NULL,
	`work_id` text NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`shelf_id`, `work_id`),
	FOREIGN KEY (`shelf_id`) REFERENCES `shelves`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shelf_items_added_idx` ON `shelf_items` (`shelf_id`,`added_at`);--> statement-breakpoint
CREATE TABLE `shelves` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shelves_user_slug_unique` ON `shelves` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`google_id` text,
	`display_name` text NOT NULL,
	`bio` text,
	`avatar_key` text,
	`is_pro` integer DEFAULT false NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`type` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`poster_url` text,
	`synopsis` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `works_source_external_unique` ON `works` (`source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `works_slug_unique` ON `works` (`slug`);--> statement-breakpoint
CREATE INDEX `works_type_idx` ON `works` (`type`);