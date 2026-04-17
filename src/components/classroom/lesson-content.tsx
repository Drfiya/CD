'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlock from '@tiptap/extension-code-block';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Link from '@tiptap/extension-link';
import { UGCText } from '@/components/translation/UGCText';

interface LessonContentProps {
  content: object;
}

export function LessonContent({ content }: LessonContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlock,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: true,
        autolink: false,
      }),
    ],
    content,
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) {
    return null;
  }

  return (
    <UGCText as="div">
      <EditorContent
        editor={editor}
        className="prose prose-gray max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_pre]:bg-gray-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded"
      />
    </UGCText>
  );
}
