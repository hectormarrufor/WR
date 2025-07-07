import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { filename } = await req.json();

  if (!filename) {
    throw new Error({ error: 'Falta nombre de archivo' }, { status: 400 });
  }

  const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

  try {
    await fs.unlink(filepath);
    return NextResponse.json({ success: true });
  } catch (err) {
    throw new Error( 'No se pudo eliminar el archivo', err.message);
  }
}