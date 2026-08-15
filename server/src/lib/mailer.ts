import nodemailer, { type Transporter } from 'nodemailer'

export interface MailerConfig {
  enabled: boolean
  from: string
  transporter?: Transporter
}

function buildConfig(): MailerConfig {
  const host = process.env.SMTP_HOST
  const pass = process.env.SMTP_PASS
  const user = process.env.SMTP_USER
  const from = process.env.MAIL_FROM ?? (user ? `Умная Корзина <${user}>` : '')
  const enabled = Boolean(host && user && pass)

  return {
    enabled,
    from,
    transporter: enabled
      ? nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: Number(process.env.SMTP_PORT ?? 587) === 465,
          auth: { user, pass },
        })
      : undefined,
  }
}

const config: MailerConfig = buildConfig()

export function isMailEnabled(): boolean {
  return config.enabled
}

// Отправка письма. Возвращает true при успехе, false — если SMTP не настроен.
// Ошибки отправки логируются, но не роняют запрос (почта не критична для бизнес-логики).
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!config.enabled || !config.transporter || !config.from) {
    return false
  }
  try {
    await config.transporter.sendMail({ from: config.from, to, subject, html })
    return true
  } catch (err) {
    console.error('[mailer] Ошибка отправки письма:', err)
    return false
  }
}

export interface OrderSummaryItem {
  name: string
  quantity: number
  price: number
}

export interface OrderSummaryForMail {
  id: string
  total: number
  items: OrderSummaryItem[]
  statusLabel?: string
  address?: string
}

// Шаблон письма о смене статуса заказа
export async function sendOrderStatusMail(to: string, order: OrderSummaryForMail): Promise<boolean> {
  const items = order.items
    .map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity} — ${item.price.toLocaleString('ru-RU')} ₽</li>`)
    .join('')
  const status = order.statusLabel ?? 'обновлён'

  return sendMail(
    to,
    `Заказ №${order.id.slice(0, 8)} — статус: ${status}`,
    `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#b45309">Статус заказа №${escapeHtml(order.id.slice(0, 8))}</h2>
        <p>Здравствуйте! Статус вашего заказа изменился на <strong>${escapeHtml(status)}</strong>.</p>
        ${
          order.address
            ? `<p>Доставка: ${escapeHtml(order.address)}</p>`
            : ''
        }
        <h3>Состав заказа</h3>
        <ul>${items}</ul>
        <p style="font-size:18px"><strong>Итого: ${order.total.toLocaleString('ru-RU')} ₽</strong></p>
        <hr style="border:none;border-top:1px solid #eee">
        <p style="color:#888;font-size:12px">Это автоматическое письмо — отслеживайте заказ в личном кабинете.</p>
      </div>
    `,
  )
}

// Шаблон письма со ссылкой сброса пароля
export async function sendPasswordResetMail(to: string, resetLink: string): Promise<boolean> {
  return sendMail(
    to,
    'Сброс пароля',
    `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#b45309">Сброс пароля</h2>
        <p>Здравствуйте! Вы запросили сброс пароля. Перейдите по ссылке ниже — она действует 1 час:</p>
        <p><a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#b45309;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Сбросить пароль</a></p>
        <p>Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
        <hr style="border:none;border-top:1px solid #eee">
        <p style="color:#888;font-size:12px">Это автоматическое письмо.</p>
      </div>
    `,
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}