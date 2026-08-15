import { expect, test } from '@playwright/test'

const unique = `e2e-${Date.now()}@test.ru`

// Критичный путь из Definition of Done: регистрация → каталог → корзина → оформление → оплата.
// Требуются запущенные dev-серверы и PAYMENTS_PROVIDER=mock (см. playwright.config.ts).
test('Покупка целиком: регистрация, каталог, корзина, чекаут, оплата', async ({ page }) => {
  await page.goto('/register')

  // Регистрация
  await page.getByLabel('Имя').fill('Тест E2E')
  await page.getByLabel('Email').fill(unique)
  await page.getByLabel('Пароль').fill('password123')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/account/)

  // Кладём первый товар каталога в корзину
  await page.goto('/catalog')
  const card = page.locator('.card').first()
  await expect(card).toBeVisible()
  await card.locator('.card-title a').click()
  await expect(page.locator('h1')).toBeVisible()
  await page.getByRole('button', { name: 'В корзину' }).click()
  await expect(page.getByText('— в корзине')).toBeVisible()

  // Корзина
  await page.goto('/cart')
  await expect(page.locator('.cart-item')).toBeVisible()
  await page.getByRole('button', { name: 'Оформить заказ' }).click()
  await expect(page).toHaveURL(/\/checkout/)

  // Адрес
  if ((await page.getByRole('radio', { name: /Дом|Работа/ }).count()) === 0) {
    await page.getByRole('button', { name: '+ Добавить адрес' }).click()
    await page.getByPlaceholder('Например: Работа').fill('Дом')
    await page.getByPlaceholder('ул. Ленина, 1, кв. 5').fill('ул. Тестовая, 7')
    await page.getByPlaceholder('Москва').fill('Москва')
    await page.getByPlaceholder('101000').fill('101000')
    await page.getByRole('button', { name: 'Сохранить адрес' }).click()
  }

  // Оплата картой: в mock-режиме редирект сразу завершает оплату
  await page.getByRole('button', { name: 'Перейти к оплате' }).click()
  await expect(page).toHaveURL(/\/checkout\/success/)
  await expect(page.getByText(/Спасибо|Заказ принят/)).toBeVisible()

  // Заказ появился и оплачен
  await page.goto('/account/orders')
  await expect(page.getByText(/Заказ №/).first()).toBeVisible()
  await expect(page.locator('.status-chip.status-paid').first()).toBeVisible()
})