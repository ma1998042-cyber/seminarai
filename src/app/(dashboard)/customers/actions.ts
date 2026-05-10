'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getOrgId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = await createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()
  return profile?.current_organization_id ?? null
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

  const admin = await createAdminClient()
  const { data: customer, error } = await admin
    .from('customers')
    .insert({ organization_id: orgId, source: 'manual', ...data })
    .select('id')
    .single()

  if (error) return { error: error.message }
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
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const admin = await createAdminClient()
  const { error } = await admin
    .from('customers')
    .update(data)
    .eq('id', customerId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/customers/${customerId}`)
  revalidatePath('/customers')
  return {}
}

export async function deleteCustomer(customerId: string): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const admin = await createAdminClient()
  const { error } = await admin
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/customers')
  return {}
}

export async function addTagToCustomer(
  customerId: string,
  tagId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未認証' }

  const admin = await createAdminClient()
  const { error } = await admin
    .from('customer_tags')
    .insert({ customer_id: customerId, tag_id: tagId, added_by: user.id })

  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath(`/customers/${customerId}`)
  return {}
}

export async function removeTagFromCustomer(
  customerId: string,
  tagId: string
): Promise<{ error?: string }> {
  const admin = await createAdminClient()
  const { error } = await admin
    .from('customer_tags')
    .delete()
    .eq('customer_id', customerId)
    .eq('tag_id', tagId)

  if (error) return { error: error.message }
  revalidatePath(`/customers/${customerId}`)
  return {}
}

export async function createTag(name: string, color: string): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const admin = await createAdminClient()
  const { error } = await admin
    .from('tags')
    .insert({ organization_id: orgId, name: name.trim(), color })

  if (error) return { error: error.message }
  revalidatePath('/customers/tags')
  return {}
}

export async function deleteTag(tagId: string): Promise<{ error?: string }> {
  const admin = await createAdminClient()
  const { error } = await admin.from('tags').delete().eq('id', tagId)
  if (error) return { error: error.message }
  revalidatePath('/customers/tags')
  revalidatePath('/customers')
  return {}
}
