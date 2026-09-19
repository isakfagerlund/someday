CREATE TABLE `board_slugs` (
	`slug` text PRIMARY KEY,
	`board_id` text NOT NULL,
	CONSTRAINT `fk_board_slugs_board_id_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`)
);
--> statement-breakpoint
ALTER TABLE `boards` ADD `archived_at` integer;