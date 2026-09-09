ALTER TABLE `products` ADD `status` text DEFAULT 'wishlist' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `owned_at` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY,
	`board_id` text NOT NULL,
	`source_url` text NOT NULL,
	`canonical_url` text NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'wishlist' NOT NULL,
	`owned_at` integer,
	`original_image_url` text DEFAULT '' NOT NULL,
	`image_key` text NOT NULL,
	`background_removed` integer DEFAULT false NOT NULL,
	`subject_scale` real DEFAULT 0.8 NOT NULL,
	`subject_position` text DEFAULT '{"x":0.5,"y":0.5}' NOT NULL,
	`import_evidence` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_products_board_id_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`),
	CONSTRAINT "products_status_check" CHECK("status" in ('wishlist', 'owned', 'archived')),
	CONSTRAINT "products_category_check" CHECK("category" in ('Clothing', 'Accessories', 'Tech', 'Home', 'Other'))
);
--> statement-breakpoint
INSERT INTO `__new_products`(`id`, `board_id`, `source_url`, `canonical_url`, `name`, `brand`, `category`, `original_image_url`, `image_key`, `background_removed`, `subject_scale`, `subject_position`, `import_evidence`, `created_at`, `updated_at`) SELECT `id`, `board_id`, `source_url`, `canonical_url`, `name`, `brand`, `category`, `original_image_url`, `image_key`, `background_removed`, `subject_scale`, `subject_position`, `import_evidence`, `created_at`, `updated_at` FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `products_catalog_index` ON `products` (`board_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_category_catalog_index` ON `products` (`board_id`,`category`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_board_url_unique` ON `products` (`board_id`,`canonical_url`);