'use server'

import { getDb, customers, customerTags, tags } from '@/lib/db'
import { getCurrentUser, getCurrentOrgId } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'

export async function createCustomer(data: {
  email: string
  full_name?: string
  phone?: string
  company?: string
  job_title?: string
  notes?: string
  status?: string
}): Promise<{ id?: string; error?: string }> {
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const db = getDb()
  const customer = await db
    .insert(customers)
    .values({
      organizationId: orgId,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      company: data.company,
      jobTitle: data.job_title,
      notes: data.notes,
      status: data.status ?? 'active',
      source: 'manual',
    })
    .returning()
    .get()

  revalidatePath('/customers')
  return { id: customer.id }
}

export async function updateCustomer(
  customerId: string,
  data: {
    full_name?: string
    email?: string
    phone?: string
    company?: string
    job_title?: string
    notes?: string
    status?: string
  }
): Promise<{ error?: string }> {
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const db = getDb()
  await db
    .update(customers)
    .set({
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      jobTitle: data.job_title,
      notes: data.notes,
      status: data.status,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, orgId)))

  revalidatePath(`/customers/${customerId}`)
  revalidatePath('/customers')
  return {}
}

export async function deleteCustomer(customerId: string): Promise<{ error?: string }> {
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const db = getDb()
  await db
    .delete(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, orgId)))

  revalidatePath('/customers')
  return {}
}

export async function addTagToCustomer(
  customerId: string,
  tagId: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: '未認証' }

  const db = getDb()
  await db
    .insert(customerTags)
    .values({ customerId, tagId, addedBy: user.id })
    .onConflictDoNothing()

  revalidatePath(`/customers/${customerId}`)
  return {}
}

export async function removeTagFromCustomer(
  customerId: string,
  tagId: string
): Promise<{ error?: string }> {
  const db = getDb()
  await db
    .delete(customerTags)
    .where(and(eq(customerTags.customerId, customerId), eq(customerTags.tagId, tagId)))

  revalidatePath(`/customers/${customerId}`)
  return {}
}

export async function createTag(name: string, color: string): Promise<{ error?: string }> {
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const db = getDb()
  await db.insert(tags).values({ organizationId: orgId, name: name.trim(), color })

  revalidatePath('/customers/tags')
  return {}
}

export async function deleteTag(tagId: string): Promise<{ error?: string }> {
  const db = getDb()
  await db.delete(tags).where(eq(tags.id, tagId))

  revalidatePath('/customers/tags')
  revalidatePath('/customers')
  return {}
}
