import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'

function mapUser(user: {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  }
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { addresses: true },
  })
  if (!user) {
    throw new HttpError(404, 'Пользователь не найден')
  }
  return {
    data: {
      ...mapUser(user),
      addresses: user.addresses.map((a) => ({
        id: a.id,
        label: a.label,
        street: a.street,
        city: a.city,
        zip: a.zip,
      })),
    },
  }
}

export interface UpdateProfileInput {
  name?: string
  phone?: string
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
    },
  })
  return { data: mapUser(user) }
}

export async function listAddresses(userId: string) {
  const addresses = await prisma.address.findMany({ where: { userId } })
  return { data: addresses }
}

export interface AddressInput {
  label: string
  street: string
  city: string
  zip?: string
}

async function findOwnedAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!address) {
    throw new HttpError(404, 'Адрес не найден')
  }
  return address
}

export async function addAddress(userId: string, input: AddressInput) {
  const address = await prisma.address.create({
    data: {
      userId,
      label: input.label,
      street: input.street,
      city: input.city,
      zip: input.zip ?? null,
    },
  })
  return { data: address }
}

export async function updateAddress(userId: string, addressId: string, input: Partial<AddressInput>) {
  await findOwnedAddress(userId, addressId)
  const address = await prisma.address.update({
    where: { id: addressId },
    data: {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.street !== undefined && { street: input.street }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.zip !== undefined && { zip: input.zip || null }),
    },
  })
  return { data: address }
}

export async function deleteAddress(userId: string, addressId: string) {
  await findOwnedAddress(userId, addressId)
  await prisma.address.delete({ where: { id: addressId } })
  return { data: null }
}