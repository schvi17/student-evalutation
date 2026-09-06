import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { studentName, evaluations } = await req.json();

    const prompt = `You are an educational assistant. Synthesize the following teacher evaluation notes for student "${studentName}" into a concise executive summary for the school principal. 

    Evaluations:
    ${JSON.stringify(evaluations, null, 2)}

    Provide a 3-bullet summary highlighting overall performance, key strengths, and areas needing support. Keep it professional.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return NextResponse.json({ summary: response.text });
  } catch (error) {
    console.error('Gemini API Error Detail:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}