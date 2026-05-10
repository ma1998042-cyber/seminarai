import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const { surveyId, respondentName, respondentEmail, answers } = await req.json()

    const admin = await createAdminClient()

    const { data: survey } = await admin
      .from('surveys')
      .select('id, title, organization_id, payment_enabled, payment_amount, thank_you_message')
      .eq('id', surveyId)
      .single()

    if (!survey || !survey.payment_enabled || !survey.payment_amount) {
      return NextResponse.json({ error: 'Invalid survey' }, { status: 400 })
    }

    // Create pending response
    const { data: response, error: respErr } = await admin
      .from('survey_responses')
      .insert({
        survey_id: surveyId,
        organization_id: survey.organization_id,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
        answers,
        payment_status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (respErr || !response) {
      return NextResponse.json({ error: '回答の保存に失敗しました' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: survey.title },
            unit_amount: survey.payment_amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: respondentEmail || undefined,
      success_url: `${appUrl}/s/${surveyId}/complete?session_id={CHECKOUT_SESSION_ID}&response_id=${response.id}`,
      cancel_url: `${appUrl}/s/${surveyId}`,
      metadata: {
        surveyResponseId: response.id,
        surveyId,
      },
    })

    // Save session ID to response
    await admin
      .from('survey_responses')
      .update({ stripe_session_id: session.id })
      .eq('id', response.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: '決済の開始に失敗しました' }, { status: 500 })
  }
}
