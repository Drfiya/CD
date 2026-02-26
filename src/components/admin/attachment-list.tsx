'use client';

import { useState, useRef } from 'react';
import { uploadAttachment, deleteAttachment } from '@/lib/attachment-actions';
import type { Attachment } from '@/types/course';

interface AttachmentListProps {
  attachments: Attachment[];
  lessonId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLS';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PPT';
  if (mimeType.includes('zip')) return 'ZIP';
  if (mimeType.includes('text') || mimeType.includes('markdown')) return 'TXT';
  return 'FILE';
}

export function AttachmentList({ attachments: initialAttachments, lessonId }: AttachmentListProps) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lessonId', lessonId);

    const result = await uploadAttachment(formData);

    if (result.error) {
      setUploadError(typeof result.error === 'string' ? result.error : 'Upload failed');
    } else if (result.attachment) {
      setAttachments((prev) => [...prev, result.attachment]);
    }

    setIsUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (confirmDeleteId !== attachmentId) {
      setConfirmDeleteId(attachmentId);
      return;
    }

    setDeletingId(attachmentId);
    setConfirmDeleteId(null);

    const result = await deleteAttachment(attachmentId);

    if (!result.error) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }

    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Attachment list */}
      {attachments.length > 0 && (
        <ul className="divide-y border rounded-lg overflow-hidden">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* File type badge */}
                <span className="shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded text-xs font-medium text-gray-600">
                  {getFileIcon(attachment.mimeType)}
                </span>

                {/* File info */}
                <div className="min-w-0">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-primary hover:underline"
                  >
                    {attachment.name}
                  </a>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {/* Download link */}
                <a
                  href={attachment.url}
                  download={attachment.name}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                >
                  Download
                </a>

                {/* Delete button with inline confirmation */}
                <button
                  type="button"
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deletingId === attachment.id}
                  className={`px-2 py-1 text-xs rounded ${confirmDeleteId === attachment.id
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    } disabled:opacity-50`}
                >
                  {deletingId === attachment.id
                    ? 'Deleting...'
                    : confirmDeleteId === attachment.id
                      ? 'Click to confirm'
                      : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {attachments.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No attachments yet. Upload files for students to download.
        </p>
      )}

      {/* Upload section */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.md"
          className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer disabled:opacity-50"
        />
        {isUploading && (
          <span className="text-sm text-gray-500">Uploading...</span>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}

      {/* Supported formats info */}
      <p className="text-xs text-gray-400">
        Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT, MD (max 10MB)
      </p>
    </div>
  );
}
