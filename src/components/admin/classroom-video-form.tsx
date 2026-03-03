'use client';

import { useState } from 'react';
import { updateClassroomVideoUrls } from '@/lib/settings-actions';
import { toast } from 'sonner';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '@/lib/translation/constants';

const LANGUAGE_FLAGS: Record<string, string> = {
    en: '🇬🇧',
    de: '🇩🇪',
    fr: '🇫🇷',
};

interface ClassroomVideoFormProps {
    currentUrls: Record<string, string>;
}

export function ClassroomVideoForm({ currentUrls }: ClassroomVideoFormProps) {
    const [urls, setUrls] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        for (const lang of SUPPORTED_LANGUAGES) {
            initial[lang] = currentUrls[lang] || '';
        }
        return initial;
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateClassroomVideoUrls(urls);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Classroom video URLs saved!');
            }
        } catch {
            toast.error('Failed to save video URLs');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {SUPPORTED_LANGUAGES.map((lang) => (
                <div key={lang}>
                    <label
                        htmlFor={`video-url-${lang}`}
                        className="block text-sm font-medium mb-1"
                    >
                        {LANGUAGE_FLAGS[lang] || ''} {LANGUAGE_NAMES[lang]} Video URL
                    </label>
                    <input
                        id={`video-url-${lang}`}
                        type="url"
                        value={urls[lang] || ''}
                        onChange={(e) =>
                            setUrls((prev) => ({ ...prev, [lang]: e.target.value }))
                        }
                        placeholder={`https://www.youtube.com/watch?v=... (${lang.toUpperCase()})`}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
            ))}

            <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Save Video URLs'}
            </button>
        </div>
    );
}
