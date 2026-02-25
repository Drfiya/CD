'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface PostEditorProps {
  content?: string;
  onChange?: (json: object) => void;
  placeholder?: string;
}

interface EmojiData {
  native: string;
}

export function PostEditor({ content, onChange, placeholder }: PostEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: content ? JSON.parse(content) : '',
    immediatelyRender: false, // CRITICAL: Prevents SSR hydration errors
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiSelect = (emoji: EmojiData) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji.native).run();
    }
    setShowEmojiPicker(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-700">
      {/* Toolbar */}
      <div className="flex gap-2 mb-3 pb-3 border-b dark:border-neutral-600">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neutral-600 rounded-full hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors ${editor.isActive('bold') ? 'bg-gray-100 dark:bg-neutral-600 border-gray-400' : ''
            }`}
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 text-sm italic text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neutral-600 rounded-full hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors ${editor.isActive('italic') ? 'bg-gray-100 dark:bg-neutral-600 border-gray-400' : ''
            }`}
          aria-label="Italic"
        >
          I
        </button>

        {/* Emoji button */}
        <div className="relative">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`px-3 py-1.5 text-sm text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neutral-600 rounded-full hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors ${showEmojiPicker ? 'bg-gray-100 dark:bg-neutral-600 border-gray-400' : ''}`}
            aria-label="Add emoji"
          >
            😊
          </button>

          {/* Emoji picker dropdown */}
          {showEmojiPicker && (
            <div
              ref={pickerRef}
              className="absolute top-full left-0 mt-2 z-50"
            >
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={2}
                perLine={8}
              />
            </div>
          )}
        </div>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none min-h-[100px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror:focus]:outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}
