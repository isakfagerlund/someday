DROP INDEX `boards_clerk_owner_id_unique`;--> statement-breakpoint
CREATE INDEX `boards_owner_index` ON `boards` (`clerk_owner_id`,`created_at`);
