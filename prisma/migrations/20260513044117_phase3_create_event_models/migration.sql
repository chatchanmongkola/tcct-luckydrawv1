-- CreateTable
CREATE TABLE "participants" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_tiers" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "tier_name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prize_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participants_campaign_id_idx" ON "participants"("campaign_id");

-- CreateIndex
CREATE INDEX "prize_tiers_campaign_id_idx" ON "prize_tiers"("campaign_id");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_tiers" ADD CONSTRAINT "prize_tiers_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
