-- Prevent duplicate WFH entries for the same user on the same date
CREATE UNIQUE INDEX "WfhLog_userId_date_key" ON "WfhLog"("userId", "date");
