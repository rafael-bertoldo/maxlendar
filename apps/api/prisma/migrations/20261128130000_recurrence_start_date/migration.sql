ALTER TABLE "RecurringEvent" ADD COLUMN "startDate" TEXT;

UPDATE "RecurringEvent" SET "startDate" = strftime('%Y-%m-%d', "createdAt") WHERE "startDate" IS NULL;
