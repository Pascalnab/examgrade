CREATE TABLE `exam_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`userId` int NOT NULL,
	`totalScore` int,
	`maxScore` int,
	`percentage` int,
	`grade` varchar(8),
	`overallFeedback` text,
	`strengths` json,
	`weaknesses` json,
	`focusAreas` json,
	`drillTopics` json,
	`analysisData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(64) NOT NULL,
	`paperType` varchar(64) NOT NULL,
	`sessionLabel` varchar(128),
	`examFileUrls` json NOT NULL,
	`markSchemeUrl` varchar(1024) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examResultId` int NOT NULL,
	`examId` int NOT NULL,
	`userId` int NOT NULL,
	`questionNumber` varchar(32) NOT NULL,
	`topic` varchar(128),
	`score` int,
	`maxScore` int,
	`isCorrect` int,
	`feedback` text,
	`studentAnswer` text,
	`correctAnswer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_results_id` PRIMARY KEY(`id`)
);
