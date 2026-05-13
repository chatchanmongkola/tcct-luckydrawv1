/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `access_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `campaigns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `draw_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `draw_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `prize_tiers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_tokens` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `password` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `username` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "access_logs" DROP CONSTRAINT "access_logs_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "draw_results" DROP CONSTRAINT "draw_results_drawSessionId_fkey";

-- DropForeignKey
ALTER TABLE "draw_results" DROP CONSTRAINT "draw_results_participantId_fkey";

-- DropForeignKey
ALTER TABLE "draw_results" DROP CONSTRAINT "draw_results_prizeTierId_fkey";

-- DropForeignKey
ALTER TABLE "draw_sessions" DROP CONSTRAINT "draw_sessions_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "draw_sessions" DROP CONSTRAINT "draw_sessions_prizeTierId_fkey";

-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "prize_tiers" DROP CONSTRAINT "prize_tiers_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "emailVerified",
DROP COLUMN "image",
DROP COLUMN "isDeleted",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "password" SET NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER',
ALTER COLUMN "username" SET NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "access_logs";

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "campaigns";

-- DropTable
DROP TABLE "draw_results";

-- DropTable
DROP TABLE "draw_sessions";

-- DropTable
DROP TABLE "participants";

-- DropTable
DROP TABLE "prize_tiers";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "verification_tokens";

-- DropEnum
DROP TYPE "CampaignStatus";

-- DropEnum
DROP TYPE "DrawState";

-- DropEnum
DROP TYPE "UserRole";
