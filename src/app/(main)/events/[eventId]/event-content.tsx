'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { EventTime } from '@/components/calendar/event-time';
import { UGCText } from '@/components/translation/UGCText';
import type { EventWithCreator } from '@/types/event';
import type { Messages } from '@/lib/i18n/messages/en';

interface EventContentProps {
  event: EventWithCreator;
  messages: Messages['eventsPage'];
}

export function EventContent({ event, messages }: EventContentProps) {
  // Initialize Tiptap editor for description (read-only)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: false,
      }),
    ],
    content: event.description as object,
    editable: false,
    immediatelyRender: false,
  });

  return (
    <div className="space-y-6">
      {/* Date and Time */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
          </div>
          <EventTime start={event.startTime} end={event.endTime} />
        </div>
      </div>

      {/* Location */}
      {event.location && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-green-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{messages.location}</p>
              {event.locationUrl ? (
                <a
                  href={event.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {event.location}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </a>
              ) : (
                <p className="text-gray-600">{event.location}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{messages.aboutThisEvent}</h2>
          {editor ? (
            <UGCText>
              <EditorContent
                editor={editor}
                className="prose prose-gray max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline"
              />
            </UGCText>
          ) : (
            <div className="animate-pulse h-20 bg-gray-100 rounded" />
          )}
        </div>
      )}

      {/* Created by */}
      <div className="text-sm text-gray-500">
        {messages.createdBy} {event.createdBy.name || 'Unknown'}
      </div>
    </div>
  );
}
