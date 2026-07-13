import { useRef, useState } from 'react';

const MAX_BYTES = 5 * 1024 * 1024;

export default function UploadDropzone({ file, onFileSelect, onError, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function validateAndSelect(candidate) {
    if (!candidate) return;
    if (candidate.type !== 'application/pdf') {
      onError('Only PDF files are supported.');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      onError('Keep it under 5MB.');
      return;
    }
    onFileSelect(candidate);
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) validateAndSelect(e.dataTransfer.files?.[0]);
      }}
      className={`rounded-lg border p-10 text-center transition-colors ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${isDragging ? 'border-ember bg-surface2' : 'border-surface2 bg-surface'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => validateAndSelect(e.target.files?.[0])}
      />
      {file ? (
        <p className="font-medium text-paper">{file.name}</p>
      ) : (
        <>
          <p className="text-paper">Drop your resume here, or click to browse</p>
          <p className="mt-1 text-sm text-fog">PDF only, up to 5MB</p>
        </>
      )}
    </div>
  );
}
