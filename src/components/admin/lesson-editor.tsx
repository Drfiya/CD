'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlock from '@tiptap/extension-code-block';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Link from '@tiptap/extension-link';
import { useState } from 'react';

interface LessonEditorProps {
  content?: string;
  onChange?: (json: object) => void;
}

export function LessonEditor({ content, onChange }: LessonEditorProps) {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use our own CodeBlock extension
      }),
      CodeBlock.configure({
        exitOnTripleEnter: true,
        exitOnArrowDown: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
    ],
    content: content ? JSON.parse(content) : '',
    immediatelyRender: false, // CRITICAL: Prevents SSR hydration errors
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl || 'https://');

    if (url === null) return; // Cancelled
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-sm font-medium ${editor.isActive('bold') ? 'bg-gray-200' : ''
            }`}
          aria-label="Bold"
          title="Bold"
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-sm ${editor.isActive('italic') ? 'bg-gray-200 italic' : ''
            }`}
          aria-label="Italic"
          title="Italic"
        >
          I
        </button>

        <span className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Headings dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            className={`px-2 py-1 rounded hover:bg-gray-200 text-sm ${editor.isActive('heading') ? 'bg-gray-200' : ''
              }`}
            aria-label="Heading"
            title="Heading"
          >
            H
            <span className="text-xs ml-0.5">v</span>
          </button>
          {showHeadingMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded shadow-lg z-10 min-w-[80px]">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: level as 1 | 2 | 3 })
                      .run();
                    setShowHeadingMenu(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm ${editor.isActive('heading', { level }) ? 'bg-gray-100' : ''
                    }`}
                >
                  Heading {level}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setShowHeadingMenu(false);
                }}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm border-t"
              >
                Paragraph
              </button>
            </div>
          )}
        </div>

        <span className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Bullet list */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-sm ${editor.isActive('bulletList') ? 'bg-gray-200' : ''
            }`}
          aria-label="Bullet list"
          title="Bullet list"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
            <line x1="9" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="9" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Ordered list */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-sm ${editor.isActive('orderedList') ? 'bg-gray-200' : ''
            }`}
          aria-label="Numbered list"
          title="Numbered list"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none">1</text>
            <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2</text>
            <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3</text>
            <line x1="9" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="9" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <span className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Code block */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-sm font-mono ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''
            }`}
          aria-label="Code block"
          title="Code block"
        >
          {'</>'}
        </button>

        {/* Table */}
        <button
          type="button"
          onClick={insertTable}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-sm ${editor.isActive('table') ? 'bg-gray-200' : ''
            }`}
          aria-label="Insert table"
          title="Insert table"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>

        {/* Link */}
        <button
          type="button"
          onClick={setLink}
          className={`px-2 py-1 rounded hover:bg-gray-200 text-sm ${editor.isActive('link') ? 'bg-gray-200' : ''
            }`}
          aria-label="Insert link"
          title="Insert link"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none [&_.ProseMirror]:min-h-[180px] [&_.ProseMirror]:outline-none [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_pre]:bg-gray-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded"
      />

      {/* Click outside to close heading menu */}
      {showHeadingMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowHeadingMenu(false)}
        />
      )}
    </div>
  );
}
