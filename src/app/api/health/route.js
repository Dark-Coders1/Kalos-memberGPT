import { NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';

export async function GET() {
  const start = Date.now();
  let dbStatus = 'ok';

  try {
    await connectDb();
  } catch {
    dbStatus = 'error';
  }

  return NextResponse.json(
    {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status: dbStatus === 'ok' ? 200 : 503 }
  );
}
