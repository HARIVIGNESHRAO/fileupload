export type AcceptedType = 'image/jpeg' | 'application/pdf';

export interface FileEntry {
    id: string;
    name: string;
    type: AcceptedType;
    size: number;
    url: string;
    uploadedAt: string;
}