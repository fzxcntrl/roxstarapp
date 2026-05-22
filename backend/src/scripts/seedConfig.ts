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

async function seedUsers() {
  console.log('👥 Seeding default users for testing...');
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@roxstar.com', username: 'admin', role: 'ADMIN', coinBalance: 10000 },
    { email: 'player1@roxstar.com', username: 'player1', role: 'USER', coinBalance: 1000 },
    { email: 'player2@roxstar.com', username: 'player2', role: 'USER', coinBalance: 1000 },
    { email: 'player3@roxstar.com', username: 'player3', role: 'USER', coinBalance: 1000 },
    { email: 'player4@roxstar.com', username: 'player4', role: 'USER', coinBalance: 1000 },
    { email: 'player5@roxstar.com', username: 'player5', role: 'USER', coinBalance: 1000 },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        username: u.username,
        passwordHash,
        role: u.role as any,
        coinBalance: u.coinBalance,
      }
    });
    console.log(`✅ Created user: ${u.email} (Password: password123)`);
  }
  console.log('🎉 User seeding completed!');
}

async function main() {
  try {
    await seedConfiguration();
    await seedUsers();
  } catch (error) {
    console.error('❌ Error seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();