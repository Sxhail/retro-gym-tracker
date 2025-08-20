CREATE TABLE `cardio_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`duration` integer NOT NULL,
	`calories_burned` integer DEFAULT 0,
	`work_time` integer,
	`rest_time` integer,
	`rounds` integer,
	`run_time` integer,
	`walk_time` integer,
	`laps` integer,
	`total_laps` integer,
	`distance` real,
	`average_heart_rate` integer,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
