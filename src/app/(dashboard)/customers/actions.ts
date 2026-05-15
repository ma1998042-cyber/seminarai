'use server'

import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import {
  createCustomer as dbCreateCustomer,
  updateCustomer as dbUpdateCustomer,
  deleteCustomer as dbDeleteCustomer,
  addCustomerTag,
  removeCustomerTag,
} from '@/lib/db/queries/customers'
import { createTag as dbCreateTag, updateTag as dbUpdateTag, deleteTag as dbDeleteTag } from '@/lib/db/queries/tags'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

async function getOrgId() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return null
  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  return profile?.currentOrganizationId ?? null
}

async function getUserId() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function createCustomer(data: {
  email: string
  full_name?: string
  phone?: string
  company?: string
  job_title?: string
  notes?: string
  status?: string
}): Promise<{ id?: string; error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    const customer = await dbCreateCustomer(db, {
      organizationId: orgId,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      company: data.company,
      jobTitle: data.job_title,
      notes: data.notes,
      status: data.status,
      source: 'manual',
    })
    revalidatePath('/customers')
    return { id: customer.id }
  } catch (e: any) {
    return { error: e.message }
  }
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
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    await dbUpdateCustomer(db, orgId, customerId, {
      fullName: data.full_name ?? null,
      email: data.email,
      phone: data.phone ?? null,
      company: data.company ?? null,
      jobTitle: data.job_title ?? null,
      notes: data.notes ?? null,
      status: data.status,
    })
    revalidatePath(`/customers/${customerId}`)
    revalidatePath('/customers')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteCustomer(customerId: string): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    await dbDeleteCustomer(db, orgId, customerId)
    revalidatePath('/customers')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function addTagToCustomer(
  customerId: string,
  tagId: string
): Promise<{ error?: string }> {
  const userId = await getUserId()
  if (!userId) return { error: '未認証' }

  try {
    const db = getDbFromContext()
    await addCustomerTag(db, customerId, tagId, userId)
    revalidatePath(`/customers/${customerId}`)
    return {}
  } catch (e: any) {
    // Ignore duplicate key (already tagged)
    if (e.message?.includes('UNIQUE constraint')) return {}
    return { error: e.message }
  }
}

export async function removeTagFromCustomer(
  customerId: string,
  tagId: string
): Promise<{ error?: string }> {
  try {
    const db = getDbFromContext()
    await removeCustomerTag(db, customerId, tagId)
    revalidatePath(`/customers/${customerId}`)
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function createTag(name: string, color: string): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    await dbCreateTag(db, { organizationId: orgId, name: name.trim(), color })
    revalidatePath('/customers/tags')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateTagAction(
  tagId: string,
  data: { name: string; color: string }
): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    await dbUpdateTag(db, orgId, tagId, { name: data.name.trim(), color: data.color })
    revalidatePath('/customers/tags')
    revalidatePath('/customers')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteTag(tagId: string): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    await dbDeleteTag(db, orgId, tagId)
    revalidatePath('/customers/tags')
    revalidatePath('/customers')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}
