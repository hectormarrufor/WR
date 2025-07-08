import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const filename = formData.get('filename'); // <- ej: modelo+placa.jpg

  if (!file || !filename) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const blob = await put(filename, file, {
    access: 'public', // archivo público
  });

  return NextResponse.json({
    url: blob.url,
    pathname: blob.pathname,
    filename,
  });
}