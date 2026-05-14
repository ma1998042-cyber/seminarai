import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Stripe integration is disabled' }, { status: 200 })
}
