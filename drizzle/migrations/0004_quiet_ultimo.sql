CREATE TABLE `program_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`day_name` text NOT NULL,
	`template_id` integer,
	`day_order` integer NOT NULL,
	`is_rest_day` integer DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`program_id`) REFERENCES `user_programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `temp_program_workouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_name` text NOT NULL,
	`workout_type` text NOT NULL,
	`exercises_json` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`duration_weeks` integer DEFAULT 4,
	`current_week` integer DEFAULT 1,
	`current_day` integer DEFAULT 1,
	`is_active` integer DEFAULT 0,
	`start_date` text,
	`last_workout_date` text,
	`completion_percentage` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
