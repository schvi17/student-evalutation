import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is missing in Vercel.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { studentName = 'Student', evaluations = [] } = body;

    const prompt = `You are an educational assistant. Synthesize the following teacher evaluation notes for student "${studentName}" into a concise executive summary for the school principal.

Evaluations:
${JSON.stringify(evaluations, null, 2)}

Provide a 3-bullet summary highlighting overall performance, key strengths, and areas needing support. Keep it professional.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Gemini API call failed' },
        { status: response.status }
      );
    }

    const summary =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No summary returned from Gemini.';

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}