'use client';

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import type { FileEntry, AcceptedType } from '@/lib/types';

const ACCEPTED_TYPES: AcceptedType[] = ['image/jpeg', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const POLL_MS = 8000;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

interface CardStyle extends CSSProperties {
  '--tilt'?: string;
}

export default function App() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data: { files: FileEntry[] } = await res.json();
      setFiles(data.files || []);
    } catch {
      setError((prev) => prev || 'Could not reach the intake desk. Try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, POLL_MS);
    return () => clearInterval(interval);
  }, [loadFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList && fileList[0];
    if (!file) return;
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
      setError('Only JPG and PDF files are accepted.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('That file is over the 10 MB limit.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data: { file?: FileEntry; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.file) throw new Error(data.error || 'Upload failed.');
      setFiles((prev) => [data.file as FileEntry, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
      <main className="wrap">
        <header className="header">
          <div className="tab">INTAKE</div>
          <h1>Shared File Desk</h1>
          <p className="sub">Drop a JPG or PDF. Anyone with this page can see what lands here.</p>
        </header>

        <section
            className={`dropzone ${dragActive ? 'active' : ''} ${uploading ? 'busy' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        >
          <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,application/pdf,image/jpeg"
              hidden
              onChange={(e) => handleUpload(e.target.files)}
          />
          <div className="stamp-mark" aria-hidden="true">{uploading ? '…' : '＋'}</div>
          <p className="drop-label">
            {uploading ? 'Filing your upload…' : dragActive ? 'Release to file it' : 'Drop file here, or click to select'}
          </p>
          <p className="drop-note">JPG or PDF · up to 10 MB</p>
        </section>

        {error && <div className="error" role="alert">{error}</div>}

        <section className="gallery">
          <div className="gallery-head">
            <h2>On the desk</h2>
            <span className="count">{loading ? 'loading…' : `${files.length} item${files.length === 1 ? '' : 's'}`}</span>
          </div>

          {!loading && files.length === 0 && (
              <div className="empty">Nothing filed yet. Be the first to drop something in.</div>
          )}

          <div className="grid">
            {files.map((f, i) => {
              const style: CardStyle = { '--tilt': `${(i % 2 === 0 ? -1 : 1) * (1.5 + (i % 3))}deg` };
              return (
                  <a
                      key={f.id}
                      className="card"
                      style={style}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                  >
                    <div className="hole" aria-hidden="true" />
                    <div className="thumb">
                      {f.type === 'image/jpeg' ? (
                          <img src={f.url} alt={f.name} loading="lazy" />
                      ) : (
                          <div className="pdf-icon">
                            <span>PDF</span>
                          </div>
                      )}
                    </div>
                    <div className="meta">
                      <p className="name" title={f.name}>{f.name}</p>
                      <p className="stamp">RECEIVED {formatStamp(f.uploadedAt)}</p>
                      <p className="size">{formatSize(f.size)}</p>
                    </div>
                  </a>
              );
            })}
          </div>
        </section>

        <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          background: #1b1d1f;
          color: #ece7db;
          font-family: 'IBM Plex Sans', sans-serif;
        }
        a { color: inherit; }
      `}</style>

        <style jsx>{`
        .wrap {
          min-height: 100vh;
          max-width: 960px;
          margin: 0 auto;
          padding: 48px 24px 96px;
        }

        .header { margin-bottom: 32px; }
        .tab {
          display: inline-block;
          background: #b5451b;
          color: #1b1d1f;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.18em;
          padding: 4px 10px;
          border-radius: 2px;
          margin-bottom: 16px;
        }
        h1 {
          font-family: 'Special Elite', 'IBM Plex Mono', monospace;
          font-size: clamp(32px, 5vw, 48px);
          margin: 0 0 8px;
          color: #ece7db;
          letter-spacing: 0.01em;
        }
        .sub {
          color: #8b8378;
          font-size: 15px;
          margin: 0;
          max-width: 46ch;
        }

        .dropzone {
          border: 2px dashed #4a463d;
          border-radius: 6px;
          padding: 40px 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
          background: rgba(216, 199, 154, 0.03);
        }
        .dropzone:hover, .dropzone:focus-visible {
          border-color: #b5451b;
          outline: none;
        }
        .dropzone.active {
          border-color: #2f6f62;
          background: rgba(47, 111, 98, 0.08);
        }
        .dropzone.busy { cursor: progress; opacity: 0.7; }

        .stamp-mark {
          width: 44px;
          height: 44px;
          margin: 0 auto 12px;
          border: 2px solid #b5451b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: #b5451b;
          font-family: 'IBM Plex Mono', monospace;
        }
        .drop-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px;
          color: #ece7db;
          margin: 0 0 4px;
        }
        .drop-note { font-size: 12px; color: #6b6459; margin: 0; }

        .error {
          margin-top: 16px;
          background: rgba(181, 69, 27, 0.15);
          border: 1px solid #b5451b;
          color: #e7a184;
          padding: 10px 14px;
          border-radius: 4px;
          font-size: 14px;
        }

        .gallery { margin-top: 48px; }
        .gallery-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          border-bottom: 1px solid #35322c;
          padding-bottom: 10px;
          margin-bottom: 24px;
        }
        h2 {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8b8378;
          margin: 0;
          font-weight: 500;
        }
        .count {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: #6b6459;
        }

        .empty {
          color: #6b6459;
          font-size: 14px;
          padding: 24px 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 22px;
        }

        .card {
          display: block;
          background: #d8c79a;
          color: #2a2420;
          border-radius: 3px;
          padding: 12px 12px 14px;
          text-decoration: none;
          position: relative;
          transform: rotate(var(--tilt));
          box-shadow: 0 6px 14px rgba(0,0,0,0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .card:hover, .card:focus-visible {
          transform: rotate(0deg) translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.45);
          outline: none;
        }

        .hole {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #1b1d1f;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);
        }

        .thumb {
          margin-top: 14px;
          height: 120px;
          border-radius: 2px;
          overflow: hidden;
          background: #c4b184;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pdf-icon {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pdf-icon span {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #6f4a1e;
          border: 2px solid #6f4a1e;
          padding: 6px 10px;
          border-radius: 2px;
          font-size: 13px;
        }

        .meta { margin-top: 10px; }
        .name {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .stamp {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #b5451b;
          letter-spacing: 0.04em;
          margin: 0 0 2px;
        }
        .size {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #6f6650;
          margin: 0;
        }
      `}</style>
      </main>
  );
}