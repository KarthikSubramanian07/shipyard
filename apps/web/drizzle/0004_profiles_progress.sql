CREATE TABLE `media_progress` (
	`user_id` text NOT NULL,
	`work_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`label` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `work_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `logs` ADD `spoiler_up_to` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `pronouns` text;--> statement-breakpoint
ALTER TABLE `users` ADD `location` text;--> statement-breakpoint
ALTER TABLE `users` ADD `banner_key` text;