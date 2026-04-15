import { NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { answerCoachQuestion } from '@/lib/membergpt';

const MAX_QUESTION_LENGTH = 500;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const question = String(body?.question ?? '').trim();

  if (!question) {
    return NextResponse.json({ error: 'question is required.' }, { status: 400 });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  try {
    await connectDb();
    const answer = await answerCoachQuestion(question);
    return NextResponse.json(
      { answer },
      {
        headers: {
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Policy': 'per-minute',
        },
      }
    );
  } catch (error) {
    console.error('[/api/membergpt/query]', error);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
