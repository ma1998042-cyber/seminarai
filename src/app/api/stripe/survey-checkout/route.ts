import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getDbFromContext } from '@/lib/db'
import { getSurveyById, createSurveyResponse, updateSurveyResponse } from '@/lib/db/queries'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

export async function POST(req: NextRequest) {
  try {
    const { surveyId, respondentName, respondentEmail, answers } = await req.json()

    const db = getDbFromContext()

    const survey = await getSurveyById(db, surveyId)

    if (!survey || !survey.paymentEnabled || !survey.paymentAmount) {
      return NextResponse.json({ error: 'Invalid survey' }, { status: 400 })
    }

    // Create pending response
    const response = await createSurveyResponse(db, {
      surveyId,
      organizationId: survey.organizationId,
      respondentName: respondentName || undefined,
      respondentEmail: respondentEmail || undefined,
      answers,
      paymentStatus: 'pending',
    })

    if (!response) {
      return NextResponse.json({ error: '回答の保存に失敗しました' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const cancelUrl = survey.eventId
      ? `${appUrl}/e/${survey.eventId}`
      : `${appUrl}/s/${surveyId}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: survey.title },
            unit_amount: survey.paymentAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: respondentEmail || undefined,
      success_url: `${appUrl}/s/${surveyId}/complete?session_id={CHECKOUT_SESSION_ID}&response_id=${response.id}`,
      cancel_url: cancelUrl,
      metadata: {
        surveyResponseId: response.id,
        surveyId,
      },
    })

    // Save session ID to response
    await updateSurveyResponse(db, response.id, { stripeSessionId: session.id })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    const message = err instanceof Error ? err.message : '不明なエラー'
    return NextResponse.json({ error: `決済の開始に失敗しました: ${message}` }, { status: 500 })
  }
}
