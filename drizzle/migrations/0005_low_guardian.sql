ALTER TABLE `workouts` ADD `program_id` integer REFERENCES user_programs(id);--> statement-breakpoint
ALTER TABLE `workouts` ADD `program_day_id` integer REFERENCES program_days(id);