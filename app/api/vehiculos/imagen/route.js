import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('imagen');

        if (!file) {
            throw new Error('No se recibió imagen');
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

        await mkdir(uploadsDir, { recursive: true }); // crea carpeta si no existe

        const filename = file.name;
        const filepath = path.join(uploadsDir, filename);
        await writeFile(filepath, buffer);

        return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (error) {
        console.error('no se pudo eliminar la imagen: ', error.message);
        throw new Error ('no se pudo eliminar la imagen: ', error.message);
    }

}