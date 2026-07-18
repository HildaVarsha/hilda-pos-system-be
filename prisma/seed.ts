import { PrismaClient, MenuCategoryType, FoodType, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';
const SALT_ROUNDS = 12;

async function upsertUser(name: string, email: string, role: Role) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  await upsertUser('Admin', 'admin@eezypos.com', Role.ADMIN);
  await upsertUser('Riya Reception', 'receptionist@eezypos.com', Role.RECEPTIONIST);
  await upsertUser('Kiran Kitchen', 'kitchen@eezypos.com', Role.KITCHEN);

  const starters = await prisma.category.upsert({
    where: { name: 'Starters' },
    update: {},
    create: { name: 'Starters', type: MenuCategoryType.STARTERS },
  });
  const mains = await prisma.category.upsert({
    where: { name: 'Main Course' },
    update: {},
    create: { name: 'Main Course', type: MenuCategoryType.MAIN_COURSE },
  });
  const drinks = await prisma.category.upsert({
    where: { name: 'Drinks' },
    update: {},
    create: { name: 'Drinks', type: MenuCategoryType.DRINKS },
  });
  const desserts = await prisma.category.upsert({
    where: { name: 'Desserts' },
    update: {},
    create: { name: 'Desserts', type: MenuCategoryType.DESSERTS },
  });

  const menuItems = [
    {
      name: 'Paneer Tikka',
      categoryId: starters.id,
      price: 220,
      prepTime: 15,
      foodType: FoodType.VEG,
    },
    {
      name: 'Chicken Seekh Kebab',
      categoryId: starters.id,
      price: 260,
      prepTime: 18,
      foodType: FoodType.NON_VEG,
    },
    {
      name: 'Veg Spring Rolls',
      categoryId: starters.id,
      price: 180,
      prepTime: 12,
      foodType: FoodType.VEG,
    },
    {
      name: 'Butter Chicken',
      categoryId: mains.id,
      price: 340,
      prepTime: 25,
      foodType: FoodType.NON_VEG,
    },
    {
      name: 'Paneer Butter Masala',
      categoryId: mains.id,
      price: 300,
      prepTime: 20,
      foodType: FoodType.VEG,
    },
    { name: 'Dal Makhani', categoryId: mains.id, price: 240, prepTime: 20, foodType: FoodType.VEG },
    { name: 'Veg Biryani', categoryId: mains.id, price: 260, prepTime: 25, foodType: FoodType.VEG },
    { name: 'Masala Chai', categoryId: drinks.id, price: 40, prepTime: 5, foodType: FoodType.VEG },
    {
      name: 'Fresh Lime Soda',
      categoryId: drinks.id,
      price: 60,
      prepTime: 5,
      foodType: FoodType.VEG,
    },
    { name: 'Cold Coffee', categoryId: drinks.id, price: 90, prepTime: 7, foodType: FoodType.VEG },
    {
      name: 'Gulab Jamun (2 pc)',
      categoryId: desserts.id,
      price: 90,
      prepTime: 5,
      foodType: FoodType.VEG,
    },
    {
      name: 'Chocolate Brownie',
      categoryId: desserts.id,
      price: 130,
      prepTime: 8,
      foodType: FoodType.VEG,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: `seed-${item.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: item.name,
        price: item.price,
        preparationTime: item.prepTime,
        foodType: item.foodType,
        categoryId: item.categoryId,
      },
    });
  }

  for (let number = 1; number <= 10; number += 1) {
    await prisma.restaurantTable.upsert({
      where: { number },
      update: {},
      create: { number, capacity: number % 3 === 0 ? 6 : 4 },
    });
  }

  console.log('✅ Seed complete.');
  console.log(`   Login with any of the seeded users, password: "${SEED_PASSWORD}"`);
  console.log('   admin@eezypos.com | receptionist@eezypos.com | kitchen@eezypos.com');
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
