export const FILE_TYPES = {
    'image/jpeg': { extension: '.jpg', label: 'JPG' },
    'application/pdf': { extension: '.pdf', label: 'PDF' },
    'application/msword': { extension: '.doc', label: 'DOC' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: '.docx', label: 'DOCX' },
} as const;

export type AcceptedType = keyof typeof FILE_TYPES;
export const ACCEPTED_TYPES = Object.keys(FILE_TYPES) as AcceptedType[];
export const FILE_ACCEPT = '.jpg,.jpeg,.pdf,.doc,.docx,' + ACCEPTED_TYPES.join(',');

export function typeFromFilename(name: string): AcceptedType | undefined {
    const extension = name.split('.').pop()?.toLowerCase();
    if (extension === 'jpeg') return 'image/jpeg';
    return ACCEPTED_TYPES.find((type) => FILE_TYPES[type].extension === `.${extension}`);
}

export function uploadType(file: { name: string; type: string }): AcceptedType | undefined {
    if (ACCEPTED_TYPES.includes(file.type as AcceptedType)) return file.type as AcceptedType;
    if (!file.type || file.type === 'application/octet-stream') return typeFromFilename(file.name);
    return undefined;
}

export interface FileEntry {
    id: string;
    name: string;
    type: AcceptedType;
    size: number;
    url: string;
    uploadedAt: string;
}