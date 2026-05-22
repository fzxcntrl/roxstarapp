"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CoinService {
    /**
     * Atomically deducts entry fee from a user
     */
    static async deductEntryFee(userId, wheelId, amount) {
        return prisma.$transaction(async (tx) => {
            // Row-level lock on user
            const users = await tx.$queryRaw `
        SELECT "id", "coinBalance" 
        FROM "User" 
        WHERE "id" = ${userId} 
        FOR UPDATE
      `;
            const user = users[0];
            if (!user) {
                throw new Error('User not found');
            }
            if (user.coinBalance < amount) {
                throw new Error('Insufficient balance');
            }
            const balanceBefore = user.coinBalance;
            const balanceAfter = balanceBefore - amount;
            await tx.$queryRaw `
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "updatedAt" = NOW()
        WHERE "id" = ${userId}
      `;
            await tx.transaction.create({
                data: {
                    userId,
                    spinWheelId: wheelId,
                    type: client_1.TransactionType.ENTRY_FEE,
                    amount: -amount,
                    balanceBefore,
                    balanceAfter
                }
            });
            return balanceAfter;
        });
    }
    /**
     * Atomically pays out to a winner
     */
    static async payoutWinner(userId, wheelId, amount) {
        return prisma.$transaction(async (tx) => {
            const users = await tx.$queryRaw `
        SELECT "id", "coinBalance" 
        FROM "User" 
        WHERE "id" = ${userId} 
        FOR UPDATE
      `;
            const user = users[0];
            if (!user)
                throw new Error('User not found');
            const balanceBefore = user.coinBalance;
            const balanceAfter = balanceBefore + amount;
            await tx.$queryRaw `
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "totalWins" = "totalWins" + 1, "updatedAt" = NOW()
        WHERE "id" = ${userId}
      `;
            await tx.transaction.create({
                data: {
                    userId,
                    spinWheelId: wheelId,
                    type: client_1.TransactionType.WINNER_PAYOUT,
                    amount,
                    balanceBefore,
                    balanceAfter
                }
            });
            return balanceAfter;
        });
    }
    /**
     * Atomically pays out to admin
     */
    static async payoutAdmin(adminId, wheelId, amount) {
        return prisma.$transaction(async (tx) => {
            const users = await tx.$queryRaw `
        SELECT "id", "coinBalance" 
        FROM "User" 
        WHERE "id" = ${adminId} 
        FOR UPDATE
      `;
            const user = users[0];
            if (!user)
                throw new Error('Admin not found');
            const balanceBefore = user.coinBalance;
            const balanceAfter = balanceBefore + amount;
            await tx.$queryRaw `
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "updatedAt" = NOW()
        WHERE "id" = ${adminId}
      `;
            await tx.transaction.create({
                data: {
                    userId: adminId,
                    spinWheelId: wheelId,
                    type: client_1.TransactionType.ADMIN_PAYOUT,
                    amount,
                    balanceBefore,
                    balanceAfter
                }
            });
            return balanceAfter;
        });
    }
    /**
     * Atomically refunds a user
     */
    static async refund(userId, wheelId, amount) {
        return prisma.$transaction(async (tx) => {
            const users = await tx.$queryRaw `
        SELECT "id", "coinBalance" 
        FROM "User" 
        WHERE "id" = ${userId} 
        FOR UPDATE
      `;
            const user = users[0];
            if (!user)
                return; // Silent if user gone
            const balanceBefore = user.coinBalance;
            const balanceAfter = balanceBefore + amount;
            await tx.$queryRaw `
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "updatedAt" = NOW()
        WHERE "id" = ${userId}
      `;
            await tx.transaction.create({
                data: {
                    userId,
                    spinWheelId: wheelId,
                    type: client_1.TransactionType.REFUND,
                    amount,
                    balanceBefore,
                    balanceAfter
                }
            });
            return balanceAfter;
        });
    }
}
exports.CoinService = CoinService;
