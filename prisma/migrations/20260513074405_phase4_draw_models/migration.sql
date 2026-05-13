-- CreateEnum
CREATE TYPE "DrawState" AS ENUM ('READY', 'DRAWING', 'COMPLETED');

-- CreateTable
CREATE TABLE "draw_sessions" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "prize_tier_id" UUID NOT NULL,
    "state" "DrawState" NOT NULL DEFAULT 'COMPLETED',
    "nonce" TEXT NOT NULL,
    "drawn_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draw_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draw_results" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "draw_session_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "prize_tier_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draw_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "draw_sessions_campaign_id_idx" ON "draw_sessions"("campaign_id");

-- CreateIndex
CREATE INDEX "draw_sessions_prize_tier_id_idx" ON "draw_sessions"("prize_tier_id");

-- CreateIndex
CREATE INDEX "draw_results_campaign_id_idx" ON "draw_results"("campaign_id");

-- CreateIndex
CREATE INDEX "draw_results_draw_session_id_idx" ON "draw_results"("draw_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "draw_results_campaign_id_participant_id_key" ON "draw_results"("campaign_id", "participant_id");

-- AddForeignKey
ALTER TABLE "draw_sessions" ADD CONSTRAINT "draw_sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_sessions" ADD CONSTRAINT "draw_sessions_prize_tier_id_fkey" FOREIGN KEY ("prize_tier_id") REFERENCES "prize_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_draw_session_id_fkey" FOREIGN KEY ("draw_session_id") REFERENCES "draw_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_results" ADD CONSTRAINT "draw_results_prize_tier_id_fkey" FOREIGN KEY ("prize_tier_id") REFERENCES "prize_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
