import React, { useRef, useState } from 'react';
import { Paperclip, X, Loader2, ImageIcon, FileText, Link } from 'lucide-react';

function isImage(url) { return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url || ''); }

/**
 * Reusable file attachment picker.
 * Props:
 *   files: [{ name, url, uploading }]
 *   onAdd: (File[]) => void   — called with raw File objects
 *   onRemove: (index) => void
 *   accept?: string
 *   label?: string
 */
export default function FileAttachmentPicker({ files = [], onAdd, onRemove, onAddUrl, accept, label }) {
  const ref = useRef();
  const [showUrl, setShowUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleChange = (e) => {
    const picked = Array.from(e.target.files);
    if (picked.length) onAdd(picked);
    e.target.value = '';
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    // Support for links: create a fake entry that is already a URL
    if (onAddUrl) {
      onAddUrl(trimmed);
    }
    setUrlInput('');
    setShowUrl(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ background: 'hsl(222,47%,20%)', border: '1px solid hsl(217,33%,30%)', color: 'hsl(215,20%,70%)' }}
        >
          <Paperclip className="w-3.5 h-3.5" />
          {label || 'Adjuntar archivos'}
        </button>
        <button
          type="button"
          onClick={() => setShowUrl(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ background: 'hsl(217,60%,18%)', border: '1px solid hsl(217,60%,28%)', color: '#60a5fa' }}
        >
          <Link className="w-3.5 h-3.5" />
          Pegar enlace
        </button>
        <span className="text-[10px]" style={{ color: 'hsl(215,20%,40%)' }}>
          Imágenes, PDF, Word, Excel…
        </span>
      </div>
      {showUrl && (
        <div className="flex gap-2 mb-2">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
            placeholder="https://..."
            className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'hsl(222,47%,18%)', border: '1px solid hsl(217,33%,28%)', color: 'white' }}
          />
          <button type="button" onClick={handleAddUrl}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'hsl(217,91%,40%)', color: 'white' }}>
            Añadir
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
              style={{ background: 'hsl(222,47%,20%)', border: '1px solid hsl(217,33%,28%)', color: 'hsl(215,20%,70%)' }}
            >
              {f.uploading
                ? <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
                : isImage(f.url) ? <ImageIcon className="w-3 h-3 text-blue-400 shrink-0" /> : <FileText className="w-3 h-3 text-blue-400 shrink-0" />
              }
              <span className="truncate max-w-[120px]">{f.name}</span>
              {!f.uploading && (
                <button type="button" onClick={() => onRemove(i)} className="text-gray-500 hover:text-red-400 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={ref}
        type="file"
        multiple
        accept={accept || "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}