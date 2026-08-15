import { expect, test, type APIRequestContext } from '@playwright/test'

// Критичный путь из Definition of Done: админ-панель (guard по роли admin,
// управление каталогом и заказами). Требует запущенные dev-серверы и seeded БД
// (admin@example.com / admin123 создаётся скриптом npm run db:seed -w server).
const API = 'http://localhost:4000/api/v1'

async function createOrder(request: APIRequestContext): Promise<string> {
  const email = `e2e-order-${Date.now()}@test.ru`
  const reg = await request.post(`${API}/auth/register`, {
    data: { email, password: 'password123', name: 'Заказчик E2E' },
  })
  expect(reg.status()).toBe(201)
  const regBody = await reg.json()
  const token = regBody.data.accessToken as string

  const authHeaders = { Authorization: `Bearer ${token}` }

  const products = await request.get(`${API}/products?perPage=1`, { headers: authHeaders })
  expect(products.status()).toBe(200)
  const product = (await products.json()).data[0] as { id: string }

  await request.post(`${API}/cart`, { headers: authHeaders, data: { productId: product.id, quantity: 1 } })

  const address = await request.post(`${API}/me/addresses`, {
    headers: authHeaders,
    data: { label: 'Дом', street: 'ул. Тестовая, 7', city: 'Москва', zip: '101000' },
  })
  expect(address.status()).toBe(201)
  const addressId = (await address.json()).data.id as string

  const order = await request.post(`${API}/orders`, {
    headers: authHeaders,
    data: { addressId, paymentMethod: 'card' },
  })
  expect(order.status()).toBe(201)
  return (await order.json()).data.id as string
}

test('Админка: вход под admin, управление товарами и статусом заказа', async ({ page, request }) => {
  // Детерминированно создаём заказ через API (порядок стабилен при параллельных тестах)
  await createOrder(request)

  // Вход под админом
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@example.com')
  await page.getByLabel('Пароль').fill('admin123')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/account/)

  // Пункт «Админ» доступен админу; открываем панель
  await page.goto('/admin')
  await expect(page.locator('h1')).toHaveText('Админ-панель')

  // Вкладка «Товары»: сид поставляет товары, создаём новый товар
  await page.getByRole('tab', { name: 'Товары' }).click()
  await expect(page.locator('table.table tbody tr').first()).toBeVisible()

  const slug = `e2e-admin-${Date.now()}`
  await page.getByRole('button', { name: '+ Новый товар' }).click()
  await page.getByLabel('Название').fill('E2E Товар админа')
  await page.getByLabel('Slug').fill(slug)
  await page.getByLabel('Цена, ₽', { exact: true }).fill('1234.5')
  await page.getByLabel('Остаток').fill('7')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('E2E Товар админа').first()).toBeVisible()

  // Вкладка «Категории»: список из сида
  await page.getByRole('tab', { name: 'Категории' }).click()
  await expect(page.locator('tbody').getByText('Электроника').first()).toBeVisible()

  // Вкладка «Заказы»: свежий заказ в статусе «Создан» можно перевести в «Оплачен»
  await page.getByRole('tab', { name: 'Заказы' }).click()
  const row = page.locator('table.table tbody tr').filter({ hasText: 'Создан' }).first()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Оплачен' }).click()
  await expect(page.locator('table.table tbody tr').filter({ hasText: 'Оплачен' }).first()).toBeVisible()
})

// Не-админ не должен попадать в /admin (redirect на главную).
test('Не-админ не имеет доступа к админке', async ({ page }) => {
  const email = `e2e-user-${Date.now()}@test.ru`
  await page.goto('/register')
  await page.getByLabel('Имя').fill('Обычный пользователь')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Пароль').fill('password123')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/account/)

  await page.goto('/admin')
  await expect(page).not.toHaveURL(/\/admin/)
})