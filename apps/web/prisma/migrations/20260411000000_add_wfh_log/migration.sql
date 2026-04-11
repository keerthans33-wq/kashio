CREATE TABLE "WfhLog" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "date"      TEXT NOT NULL,
    "hours"     DOUBLE PRECISION NOT NULL,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WfhLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WfhLog_userId_idx" ON "WfhLog"("userId");
