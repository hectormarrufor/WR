import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 });

  await del(url);
  return NextResponse.json({ deleted: true });
}