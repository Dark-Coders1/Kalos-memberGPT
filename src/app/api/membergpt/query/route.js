import { NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { answerCoachQuestion } from '@/lib/membergpt';

export async function POST(req) {
  try {
    await connectDb();
    const body = await req.json();
    const answer = await answerCoachQuestion(body?.question);
    return NextResponse.json({ answer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
