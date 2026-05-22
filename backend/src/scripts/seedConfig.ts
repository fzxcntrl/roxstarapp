import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedConfiguration() {
  console.log('🌱 Seeding configuration...');

  const configs = [
    // Coin Distribution Configuration
    { key: 'winner_pool_percentage', value: 0.8 },
    { key: 'admin_pool_percentage', value: 0.1 },
    { key: 'app_pool_percentage', value: 0.1 },
    
    // Game Configuration
    { key: 'auto_start_delay_minutes', value: 3 },
    { key: 'elimination_interval_seconds', value: 7 },
    { key: 'min_participants', value: 3 },
    { key: 'max_participants', value: 20 },
    
    // Additional Configuration
    { key: 'default_entry_fee', value: 100 },
    { key: 'starting_coin_balance', value: 1000 },
    { key: 'max_wheels_per_day', value: 50 }
  ];

  for (const config of configs) {
    await prisma.config.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: {
        key: config.key,
        value: config.value
      }
    });
    console.log(`✅ Set ${config.key} = ${config.value}`);
  }

  console.log('🎉 Configuration seeding completed!');
}

async function main() {
  try {
    await seedConfiguration();
  } catch (error) {
    console.error('❌ Error seeding configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();