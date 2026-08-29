CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`source_url` text NOT NULL,
	`canonical_url` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`category` text NOT NULL,
	`image_key` text NOT NULL,
	`import_evidence` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_products_board_id_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`),
	CONSTRAINT "products_category_check" CHECK("category" in ('Clothing', 'Accessories', 'Tech', 'Other'))
);
--> statement-breakpoint
CREATE INDEX `products_catalog_index` ON `products` (`board_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_category_catalog_index` ON `products` (`board_id`,`category`,`created_at`);--> statement-breakpoint
INSERT INTO `boards` (`id`) VALUES ('default');
