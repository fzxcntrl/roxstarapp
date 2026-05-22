import { CoinService } from '../coinService';
import { PrismaClient, TransactionType } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    transaction: {
      create: jest.fn()
    }
  };
  return { PrismaClient: jest.fn(() => mPrismaClient), TransactionType: { ENTRY_FEE: 'ENTRY_FEE', WINNER_PAYOUT: 'WINNER_PAYOUT', ADMIN_PAYOUT: 'ADMIN_PAYOUT', REFUND: 'REFUND' } };
});

const prisma = new PrismaClient() as jest.Mocked<any>;

describe('CoinService Atomic Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deductEntryFee', () => {
    it('should throw error if user not found', async () => {
      // Mock the transaction callback behavior
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]), // No user returned
          transaction: { create: jest.fn() }
        };
        return callback(tx);
      });

      await expect(CoinService.deductEntryFee('user-1', 'wheel-1', 10)).rejects.toThrow('User not found');
    });

    it('should throw error if insufficient balance', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-1', coinBalance: 5 }]), // Balance 5 < amount 10
          transaction: { create: jest.fn() }
        };
        return callback(tx);
      });

      await expect(CoinService.deductEntryFee('user-1', 'wheel-1', 10)).rejects.toThrow('Insufficient balance');
    });

    it('should deduct fee atomically and record transaction', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        // Mock the two $queryRaw calls in deductEntryFee
        // First is SELECT FOR UPDATE, Second is UPDATE
        let queryCount = 0;
        const tx = {
          $queryRaw: jest.fn().mockImplementation(() => {
            queryCount++;
            if (queryCount === 1) return Promise.resolve([{ id: 'user-1', coinBalance: 50 }]);
            return Promise.resolve(); // UPDATE returns void
          }),
          transaction: { create: jest.fn().mockResolvedValue({}) }
        };
        return callback(tx);
      });

      const newBalance = await CoinService.deductEntryFee('user-1', 'wheel-1', 10);
      expect(newBalance).toBe(40);
    });
  });

  describe('payoutWinner', () => {
    it('should atomically add payout to balance', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        let queryCount = 0;
        const tx = {
          $queryRaw: jest.fn().mockImplementation(() => {
            queryCount++;
            if (queryCount === 1) return Promise.resolve([{ id: 'user-1', coinBalance: 10 }]);
            return Promise.resolve();
          }),
          transaction: { create: jest.fn().mockResolvedValue({}) }
        };
        return callback(tx);
      });

      const newBalance = await CoinService.payoutWinner('user-1', 'wheel-1', 100);
      expect(newBalance).toBe(110);
    });
  });
});
