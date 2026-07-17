import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { FileEntry } from '@/lib/types';

const DB_PATH = path.join(process.cwd(), 'data', 'files.json');

export async function GET() {
    try {
        const raw = await readFile(DB_PATH, 'utf-8');
        const files = JSON.parse(raw) as FileEntry[];
        return NextResponse.json({ files });
    } catch {
        return NextResponse.json({ files: [] });
    }
}