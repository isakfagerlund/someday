ALTER TABLE `products` ADD `original_image_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `background_removed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `subject_scale` real DEFAULT 0.8 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `subject_position` text DEFAULT '{"x":0.5,"y":0.5}' NOT NULL;