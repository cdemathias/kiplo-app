import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an assistant that extracts structured profile information about a team member from a manager's description. 

Extract the following fields from the text. If a field is not mentioned or cannot be inferred, return null for that field.

Return a JSON object with these exact fields:
- role: Their job title or role (string or null)
- current_focus: What projects or initiatives they're currently working on (string or null)
- growth_goals: What the manager wants to help them achieve or develop (string or null)
- one_on_one_themes: Key topics or themes for 1:1 meetings (string or null)
- feedback_preferences: How they prefer to receive feedback (string or null)

Be concise but capture the key information. Keep each field to 1-2 sentences max.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    const profile = JSON.parse(content)

    return NextResponse.json({
      role: profile.role || null,
      current_focus: profile.current_focus || null,
      growth_goals: profile.growth_goals || null,
      one_on_one_themes: profile.one_on_one_themes || null,
      feedback_preferences: profile.feedback_preferences || null,
    })
  } catch (error) {
    console.error('Error extracting profile:', error)
    return NextResponse.json(
      { error: 'Failed to extract profile' },
      { status: 500 }
    )
  }
}
