import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ConfigService {
  private static cache = new Map<string, any>();
  private static cacheExpiry = new Map<string, number>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get configuration value with caching
   */
  static async get(key: string, defaultValue?: any): Promise<any> {
    const now = Date.now();
    
    // Check cache first
    if (this.cache.has(key) && this.cacheExpiry.get(key)! > now) {
      return this.cache.get(key);
    }

    try {
      const config = await prisma.config.findUnique({
        where: { key }
      });

      const value = config ? config.value : defaultValue;
      
      // Cache the result
      this.cache.set(key, value);
      this.cacheExpiry.set(key, now + this.CACHE_TTL);
      
      return value;
    } catch (error) {
      console.error(`Failed to get config ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set configuration value and clear cache
   */
  static async set(key: string, value: any): Promise<void> {
    await prisma.config.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value }
    });

    // Clear cache
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  /**
   * Get coin distribution configuration
   */
  static async getCoinDistribution() {
    const [winnerPercentage, adminPercentage, appPercentage] = await Promise.all([
      this.get('winner_pool_percentage', 0.8),
      this.get('admin_pool_percentage', 0.1),
      this.get('app_pool_percentage', 0.1)
    ]);

    return {
      winnerPercentage: Number(winnerPercentage),
      adminPercentage: Number(adminPercentage),
      appPercentage: Number(appPercentage)
    };
  }

  /**
   * Get game configuration
   */
  static async getGameConfig() {
    const [autoStartDelay, eliminationInterval, minParticipants, maxParticipants] = await Promise.all([
      this.get('auto_start_delay_minutes', 3),
      this.get('elimination_interval_seconds', 7),
      this.get('min_participants', 3),
      this.get('max_participants', 20)
    ]);

    return {
      autoStartDelayMinutes: Number(autoStartDelay),
      eliminationIntervalSeconds: Number(eliminationInterval),
      minParticipants: Number(minParticipants),
      maxParticipants: Number(maxParticipants)
    };
  }

  /**
   * Clear all cache (useful for testing or admin operations)
   */
  static clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}