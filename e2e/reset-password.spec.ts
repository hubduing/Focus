import { expect, test } from '@playwright/test'

// Страница сброса пароля: запрос ссылки и валидация формы установки нового пароля.
test('Сброс пароля: форма запроса ссылки и установка нового пароля', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Забыли пароль?' }).click()
  await expect(page).toHaveURL(/\/reset-password/)

  // Запрос ссылки: сообщение не раскрывает наличие аккаунта
  await page.getByLabel('Email').fill(`e2e-reset-${Date.now()}@test.ru`)
  await page.getByRole('button', { name: 'Отправить ссылку' }).click()
  await expect(page.getByText(/если аккаунт с таким email/i)).toBeVisible()

  // Страница установки нового пароля требует токен
  await page.goto('/reset-password')
  await expect(page.locator('h1')).toHaveText('Сброс пароля')

  await page.goto('/reset-password?token=abc123')
  await expect(page.locator('h1')).toHaveText('Новый пароль')
  await page.getByLabel('Новый пароль').fill('newpassword123')
  await page.getByRole('button', { name: 'Сохранить пароль' }).click()
  // Недействительный токен — показываем ошибку, а не экран успеха
  await expect(page.getByText(/недействительная|истекла|не найден/i)).toBeVisible()
})