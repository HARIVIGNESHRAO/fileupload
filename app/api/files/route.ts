import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import type { FileEntry } from '@/lib/types';

const DB_PATH = path.join(process.cwd(), 'data', 'files.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

async function readMetadata(): Promise<FileEntry[]> {
    try {
        return JSON.parse(await readFile(DB_PATH, 'utf-8')) as FileEntry[];
    } catch {
        return [];
    }
}

export async function GET() {
    try {
        const [metadata, entries] = await Promise.all([
            readMetadata(),
            readdir(UPLOAD_DIR, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
                if (error.code === 'ENOENT') return [];
                throw error;
            }),
        ]);
        const files: FileEntry[] = [];
        for (const entry of entries) {
            if (!entry.isFile() || !/\.(jpe?g|pdf)$/i.test(entry.name)) continue;
            let details;
            try {
                details = await stat(path.join(UPLOAD_DIR, entry.name));
            } catch (error) {
                // A file may be removed between reading the directory and its details.
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
                throw error;
            }
            const url = `/uploads/${encodeURIComponent(entry.name)}`;
            const saved = metadata.find((file) => file.url.split('?')[0] === url);
            files.push({
                id: saved?.id ?? entry.name,
                name: saved?.name ?? entry.name,
                type: /\.pdf$/i.test(entry.name) ? 'application/pdf' : 'image/jpeg',
                size: details.size,
                url: `${url}?v=${details.mtimeMs}`,
                uploadedAt: saved?.uploadedAt ?? details.mtime.toISOString(),
            });
        }
        files.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
        return NextResponse.json({ files }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('File listing error:', error);
        return NextResponse.json({ error: 'Could not list files.' }, { status: 500 });
    }
}
