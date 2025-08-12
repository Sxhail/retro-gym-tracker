CREATE TABLE `active_session_timers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`timer_type` text NOT NULL,
	`start_time` text NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`elapsed_when_paused` integer DEFAULT 0,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`session_id`) REFERENCES `active_workout_sessions`(`session_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `active_workout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`start_time` text NOT NULL,
	`elapsed_time` integer DEFAULT 0 NOT NULL,
	`is_paused` integer DEFAULT 0 NOT NULL,
	`current_exercise_index` integer DEFAULT 0,
	`session_data` text NOT NULL,
	`last_updated` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `active_workout_sessions_session_id_unique` ON `active_workout_sessions` (`session_id`);