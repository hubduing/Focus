import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/passwords.js'

const prisma = new PrismaClient()

// Тестовая карта Stripe (test mode): 4242 4242 4242 4242, любой срок, любой CVC.
const STRIPE_TEST_CARD = '4242 4242 4242 4242'

const categories = [
  { name: 'Электроника', slug: 'electronics', position: 1 },
  { name: 'Одежда', slug: 'clothing', position: 2 },
  { name: 'Дом и сад', slug: 'home', position: 3 },
  { name: 'Спорт и отдых', slug: 'sport', position: 4 },
]

const children = [
  { parent: 'electronics', name: 'Смартфоны', slug: 'smartphones', position: 1 },
  { parent: 'electronics', name: 'Ноутбуки', slug: 'laptops', position: 2 },
  { parent: 'electronics', name: 'Наушники', slug: 'headphones', position: 3 },
  { parent: 'clothing', name: 'Женщинам', slug: 'womens', position: 1 },
  { parent: 'clothing', name: 'Мужчинам', slug: 'mens', position: 2 },
  { parent: 'home', name: 'Кухня', slug: 'kitchen', position: 1 },
  { parent: 'home', name: 'Декор', slug: 'decor', position: 2 },
  { parent: 'sport', name: 'Фитнес', slug: 'fitness', position: 1 },
  { parent: 'sport', name: 'Туризм', slug: 'outdoor', position: 2 },
]

const products = [
  {
    slug: 'smartphone-alpha-x1',
    name: 'AlphaPhone X1 Pro',
    category: 'smartphones',
    description: 'Флагманский смартфон с AMOLED-экраном 6.7", тройной камерой 108 Мп и батареей 5000 мАч.',
    price: 74990,
    discountPrice: 69990,
    stock: 25,
    attributes: { brand: 'AlphaPhone', screen: '6.7"' },
    images: ['https://picsum.photos/seed/alpha1/600/600'],
  },
  {
    slug: 'smartphone-omega-5',
    name: 'Omega 5 Plus',
    category: 'smartphones',
    description: 'Компактный смартфон среднего сегмента: OLED 6.1", 256 ГБ, поддержка 5G.',
    price: 32990,
    stock: 40,
    attributes: { brand: 'Omega', screen: '6.1"' },
    images: ['https://picsum.photos/seed/omega5/600/600'],
  },
  {
    slug: 'laptop-gamma-pro',
    name: 'GammaBook Pro 16',
    category: 'laptops',
    description: 'Ультрабук 16" 2.8K, процессор i7, 32 ГБ ОЗУ, SSD 1 ТБ, вес 1.4 кг.',
    price: 154990,
    discountPrice: 139990,
    stock: 15,
    attributes: { brand: 'Gamma', cpu: 'Intel i7' },
    images: ['https://picsum.photos/seed/gamma16/600/600'],
  },
  {
    slug: 'laptop-vega-air',
    name: 'Vega Air 14',
    category: 'laptops',
    description: 'Бюджетный ноутбук для работы и учёбы: Ryzen 5, 16 ГБ ОЗУ, SSD 512 ГБ.',
    price: 64990,
    stock: 30,
    attributes: { brand: 'Vega', cpu: 'AMD Ryzen 5' },
    images: ['https://picsum.photos/seed/vega14/600/600'],
  },
  {
    slug: 'headphones-suite-anc',
    name: 'Suite ANC Wireless',
    category: 'headphones',
    description: 'Беспроводные наушники с активным шумоподавлением и 40 часами работы.',
    price: 12490,
    discountPrice: 9990,
    stock: 60,
    attributes: { brand: 'Suite', anc: true },
    images: ['https://picsum.photos/seed/suiteanc/600/600'],
  },
  {
    slug: 'dress-aurora',
    name: 'Платье Aurora',
    category: 'womens',
    description: 'Летнее платье из вискозы, свободный крой, длина миди.',
    price: 4590,
    stock: 18,
    attributes: { material: 'вискоза', size: 'S-XL' },
    images: ['https://picsum.photos/seed/aurora/600/600'],
  },
  {
    slug: 'hoodie-north',
    name: 'Худи North',
    category: 'mens',
    description: 'Худи из плотного футера с капюшоном, оверсайз.',
    price: 3890,
    discountPrice: 3290,
    stock: 45,
    attributes: { material: 'футер', size: 'S-XXL' },
    images: ['https://picsum.photos/seed/hoodie/600/600'],
  },
  {
    slug: 'kettle-scala',
    name: 'Электрочайник Scala 1.7 л',
    category: 'kitchen',
    description: 'Нагревает воду за 4 минуты, termos-режим и подсветка.',
    price: 2990,
    stock: 50,
    attributes: { brand: 'Scala', volume: '1.7 л' },
    images: ['https://picsum.photos/seed/scala/600/600'],
  },
  {
    slug: 'lamp-vector-soft',
    name: 'Светильник Vector Soft',
    category: 'decor',
    description: 'Настольная лампа с тёплым светом и регулировкой яркости.',
    price: 2490,
    stock: 35,
    attributes: { power: '7 Вт', temperature: '2700K' },
    images: ['https://picsum.photos/seed/vector/600/600'],
  },
  {
    slug: 'yoga-mat-motion',
    name: 'Коврик для йоги Motion',
    category: 'fitness',
    description: 'Спортивный коврик 6 мм с сумкой для переноски.',
    price: 1490,
    discountPrice: 1190,
    stock: 80,
    attributes: { material: 'TPE', thickness: '6 мм' },
    images: ['https://picsum.photos/seed/motion/600/600'],
  },
  {
    slug: 'bottle-trail-07',
    name: 'Термобутылка Trail 0.7 л',
    category: 'outdoor',
    description: 'Держит тепло до 12 часов, герметичный клапан, подходит для походов.',
    price: 1190,
    stock: 70,
    attributes: { brand: 'Trail', volume: '0.7 л' },
    images: ['https://picsum.photos/seed/trail/600/600'],
  },
  {
    slug: 'gloves-median',
    name: 'Перчатки Median',
    category: 'mens',
    description: 'Тёплые кожаные перчатки с сенсорными пальцами.',
    price: 2290,
    stock: 22,
    attributes: { material: 'кожа', size: 'M-L' },
    images: ['https://picsum.photos/seed/median/600/600'],
  },
]

async function upsertCategoryTree() {
  const parents = new Map<string, string>()
  for (const cat of categories) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, position: cat.position },
      create: { name: cat.name, slug: cat.slug, position: cat.position },
    })
    parents.set(cat.slug, row.id)
  }
  for (const child of children) {
    const parentId = parents.get(child.parent)!
    await prisma.category.upsert({
      where: { slug: child.slug },
      update: { name: child.name, parentId, position: child.position },
      create: { name: child.name, slug: child.slug, parentId, position: child.position },
    })
  }
}

async function seedProducts() {
  for (const p of products) {
    const category = await prisma.category.findUnique({ where: { slug: p.category } })
    if (!category) throw new Error(`Категория не найдена: ${p.category}`)
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        categoryId: category.id,
        name: p.name,
        description: p.description,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        stock: p.stock,
        attributes: p.attributes,
        images: p.images,
        active: true,
      },
      create: {
        categoryId: category.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        stock: p.stock,
        attributes: p.attributes,
        images: p.images,
        active: true,
      },
    })
  }
}

async function seedUsers() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'admin' },
    create: {
      email: 'admin@example.com',
      passwordHash: await hashPassword('admin123'),
      name: 'Администратор',
      role: 'admin',
    },
  })
  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: await hashPassword('user123'),
      name: 'Иван Петров',
      phone: '+7 900 000-00-00',
    },
  })
  return admin
}

async function main() {
  await upsertCategoryTree()
  await seedUsers()
  await seedProducts()

  const [categoriesCount, productsCount, usersCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.user.count(),
  ])

  console.log('Seed завершён:')
  console.log(`  категорий: ${categoriesCount}`)
  console.log(`  товаров: ${productsCount}`)
  console.log(`  пользователей: ${usersCount}`)
  console.log('')
  console.log('Демо-аккаунты: admin@example.com / admin123, user@example.com / user123')
  console.log(`Тестовая карта Stripe: ${STRIPE_TEST_CARD} (любой срок, любой CVC)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())