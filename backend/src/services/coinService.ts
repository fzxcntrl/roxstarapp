import { PrismaClient, TransactionType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class CoinService {
  /**
   * Atomically deducts entry fee from a user
   */
  static async deductEntryFee(userId: string, wheelId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      // Row-level lock on user
      const users = await tx.$queryRaw<any[]>`
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

      await tx.$queryRaw`
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "updatedAt" = NOW()
        WHERE "id" = ${userId}
      `;

      await tx.transaction.create({
        data: {
          userId,
          spinWheelId: wheelId,
          type: TransactionType.ENTRY_FEE,
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
  static async payoutWinner(userId: string, wheelId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw<any[]>`
        SELECT "id", "coinBalance" 
        FROM "User" 
        WHERE "id" = ${userId} 
        FOR UPDATE
      `;
      const user = users[0];

      if (!user) throw new Error('User not found');

      const balanceBefore = user.coinBalance;
      const balanceAfter = balanceBefore + amount;

      await tx.$queryRaw`
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "totalWins" = "totalWins" + 1, "updatedAt" = NOW()
        WHERE "id" = ${userId}
      `;

      await tx.transaction.create({
        data: {
          userId,
          spinWheelId: wheelId,
          type: TransactionType.WINNER_PAYOUT,
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
  static async payoutAdmin(adminId: string, wheelId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw<any[]>`
        SELECT "id", "coinBalance" 
        FROM "User" 
        WHERE "id" = ${adminId} 
        FOR UPDATE
      `;
      const user = users[0];

      if (!user) throw new Error('Admin not found');

      const balanceBefore = user.coinBalance;
      const balanceAfter = balanceBefore + amount;

      await tx.$queryRaw`
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "updatedAt" = NOW()
        WHERE "id" = ${adminId}
      `;

      await tx.transaction.create({
        data: {
          userId: adminId,
          spinWheelId: wheelId,
          type: TransactionType.ADMIN_PAYOUT,
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
  static async refund(userId: string, wheelId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw<any[]>`
        SELECT "id", "coinBalance" 
        FROM "User" 
        WHERE "id" = ${userId} 
        FOR UPDATE
      `;
      const user = users[0];
      if (!user) return; // Silent if user gone

      const balanceBefore = user.coinBalance;
      const balanceAfter = balanceBefore + amount;

      await tx.$queryRaw`
        UPDATE "User"
        SET "coinBalance" = ${balanceAfter}, "updatedAt" = NOW()
        WHERE "id" = ${userId}
      `;

      await tx.transaction.create({
        data: {
          userId,
          spinWheelId: wheelId,
          type: TransactionType.REFUND,
          amount,
          balanceBefore,
          balanceAfter
        }
      });

      return balanceAfter;
    });
  }
}
