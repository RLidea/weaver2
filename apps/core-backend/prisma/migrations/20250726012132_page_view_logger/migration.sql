-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "pageUrl" VARCHAR(500) NOT NULL,
    "userId" TEXT,
    "ipAddress" VARCHAR(45),
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyAnalyticsReport" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalPageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "dailyAvgViews" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peakDailyViews" INTEGER NOT NULL DEFAULT 0,
    "topPages" JSONB,
    "trafficSources" JSONB,
    "dailyTrends" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyAnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_pageUrl_createdAt_idx" ON "PageView"("pageUrl", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_userId_createdAt_idx" ON "PageView"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAnalyticsReport_year_month_key" ON "MonthlyAnalyticsReport"("year", "month");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
