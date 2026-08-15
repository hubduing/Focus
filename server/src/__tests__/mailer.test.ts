import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendMail, sendOrderStatusMail, sendPasswordResetMail, isMailEnabled } from '../lib/mailer.js'

// makeMailEnabled сбрасывается при импорте модуля, поэтому здесь проверяем
// поведение без переменных SMTP: отправка невозможна и не падает.
describe('mailer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('без SMTP isMailEnabled() = false', () => {
    expect(isMailEnabled()).toBe(false)
  })

  it('sendMail без SMTP возвращает false и не бросает', async () => {
    await expect(sendMail('a@example.com', 'тема', '<p>html</p>')).resolves.toBe(false)
  })

  it('sendPasswordResetMail без SMTP возвращает false', async () => {
    await expect(sendPasswordResetMail('a@example.com', 'http://localhost/reset?token=123')).resolves.toBe(false)
  })

  it('sendOrderStatusMail без SMTP возвращает false', async () => {
    await expect(
      sendOrderStatusMail('a@example.com', {
        id: 'order-1',
        total: 321,
        items: [{ name: 'Товар', quantity: 2, price: 160.5 }],
        statusLabel: 'Оплачен',
        address: 'Москва, ул. Тестовая, 7',
      }),
    ).resolves.toBe(false)
  })
})