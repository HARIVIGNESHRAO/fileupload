import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { FileEntry, AcceptedType } from '@/lib/types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const DB_PATH = path.join(process.cwd(), 'data', 'files.json');
const ACCEPTED_TYPES: AcceptedType[] = ['image/jpeg', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function readDb(): Promise<FileEntry[]> {
    try {
        const raw = await readFile(DB_PATH, 'utf-8');
        return JSON.parse(raw) as FileEntry[];
    } catch {
        return [];
    }
}

async function writeDb(entries: FileEntry[]): Promise<void> {
    await mkdir(path.dirname(DB_PATH), { recursive: true });
    await writeFile(DB_PATH, JSON.stringify(entries, null, 2));
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }
        if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
            return NextResponse.json({ error: 'Only JPG and PDF files are accepted.' }, { status: 400 });
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'That file is over the 10 MB limit.' }, { status: 400 });
        }

        await mkdir(UPLOAD_DIR, { recursive: true });

        const ext = file.type === 'application/pdf' ? '.pdf' : '.jpg';
        const id = crypto.randomUUID();
        const storedName = `${id}${ext}`;
        const bytes = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(UPLOAD_DIR, storedName), bytes);

        const entry: FileEntry = {
            id,
            name: file.name,
            type: file.type as AcceptedType,
            size: file.size,
            url: `/uploads/${storedName}`,
            uploadedAt: new Date().toISOString(),
        };

        const entries = await readDb();
        entries.unshift(entry);
        await writeDb(entries);

        return NextResponse.json({ file: entry }, { status: 201 });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ error: 'Upload failed. Try again.' }, { status: 500 });
    }
}