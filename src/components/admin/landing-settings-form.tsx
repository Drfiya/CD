'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    updateLandingPageSettings,
    updateLandingTranslation,
    autoTranslateLanding,
    type CommunitySettings,
    type LandingTranslation,
} from '@/lib/settings-actions';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

interface LandingSettingsFormProps {
    settings: CommunitySettings;
}

const DEFAULT_BENEFITS = [
    'Access to all expert-led courses and masterclasses',
    'Join live Q&A sessions and workshops with leading scientists',
    'Private discussion forums with peer researchers',
    'Weekly science briefings and trend analysis',
    'Exclusive networking events and collaborations',
    'Certificate of participation for completed courses',
    'Direct access to mentors and advisors',
    'Community-driven research project opportunities',
];

export function LandingSettingsForm({ settings }: LandingSettingsFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedLang, setSelectedLang] = useState('en');
    const [isTranslating, setIsTranslating] = useState(false);

    // ── English (primary) state ──
    const [headline, setHeadline] = useState(settings.landingHeadline || '');
    const [subheadline, setSubheadline] = useState(settings.landingSubheadline || '');
    const [description, setDescription] = useState(settings.landingDescription || '');
    const [ctaText, setCtaText] = useState(settings.landingCtaText || '');
    const [priceUsd, setPriceUsd] = useState(settings.landingPriceUsd);
    const [priceEur, setPriceEur] = useState(settings.landingPriceEur);
    const [videoUrls, setVideoUrls] = useState<string[]>(
        settings.landingVideoUrls.length > 0 ? settings.landingVideoUrls : ['']
    );
    const [benefits, setBenefits] = useState<string[]>(
        settings.landingBenefits.length > 0 ? settings.landingBenefits : DEFAULT_BENEFITS
    );

    // ── Per-language translation state ──
    const [translations, setTranslations] = useState<Record<string, LandingTranslation>>(
        settings.landingTranslations || {}
    );

    function getTranslation(lang: string): LandingTranslation {
        return translations[lang] || {};
    }

    function updateTranslationField(lang: string, field: keyof LandingTranslation, value: string | string[]) {
        setTranslations(prev => ({
            ...prev,
            [lang]: { ...(prev[lang] || {}), [field]: value },
        }));
    }

    const currentLangMeta = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);
    const translatedLanguages = Object.keys(translations).filter(
        k => k !== 'en' && translations[k]?.headline
    );

    // ── Save English content ──
    function handleSaveEnglish() {
        startTransition(async () => {
            const result = await updateLandingPageSettings({
                landingHeadline: headline || undefined,
                landingSubheadline: subheadline || undefined,
                landingDescription: description || undefined,
                landingCtaText: ctaText || undefined,
                landingPriceUsd: priceUsd,
                landingPriceEur: priceEur,
                landingVideoUrls: videoUrls.filter(u => u.trim() !== ''),
                landingBenefits: benefits.filter(b => b.trim() !== ''),
            });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('English content saved');
                router.refresh();
            }
        });
    }

    // ── Save translation for a language ──
    function handleSaveTranslation(lang: string) {
        const data = getTranslation(lang);
        startTransition(async () => {
            const result = await updateLandingTranslation(lang, {
                headline: data.headline,
                subheadline: data.subheadline,
                description: data.description,
                benefits: data.benefits?.filter(b => b.trim() !== ''),
                ctaText: data.ctaText,
                videoUrls: data.videoUrls?.filter(u => u.trim() !== ''),
            });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`${currentLangMeta?.label} translation saved`);
                router.refresh();
            }
        });
    }

    // ── Auto-translate from English ──
    async function handleAutoTranslate(lang: string) {
        setIsTranslating(true);
        try {
            const result = await autoTranslateLanding(lang);
            if (result.error) {
                toast.error(result.error);
            } else if (result.data) {
                setTranslations(prev => ({
                    ...prev,
                    [lang]: {
                        ...(prev[lang] || {}),
                        ...result.data,
                        videoUrls: prev[lang]?.videoUrls || [],
                    },
                }));
                toast.success(`Auto-translated to ${SUPPORTED_LANGUAGES.find(l => l.code === lang)?.label}`);
            }
        } catch {
            toast.error('Translation failed');
        } finally {
            setIsTranslating(false);
        }
    }

    // ── Shared input styles ──
    const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-6 space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Landing Page Settings</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                    Configure the public landing page. Select a language to manage translations.
                </p>
            </div>

            {/* ── Language Selector (Dropdown) ── */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-200">Language:</label>
                <select
                    value={selectedLang}
                    onChange={e => setSelectedLang(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                >
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                            {lang.flag}  {lang.label}
                            {lang.code === 'en' ? ' (Primary)' : ''}
                            {lang.code !== 'en' && translatedLanguages.includes(lang.code) ? ' ✓' : ''}
                        </option>
                    ))}
                </select>
                {translatedLanguages.length > 0 && (
                    <span className="text-xs text-gray-400 dark:text-neutral-500">
                        {translatedLanguages.length} translation{translatedLanguages.length !== 1 ? 's' : ''} saved
                    </span>
                )}
            </div>

            {/* ── ENGLISH FORM ── */}
            {selectedLang === 'en' && (
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Headline</label>
                        <input type="text" value={headline} onChange={e => setHeadline(e.target.value)}
                            placeholder="Join the Science Experts Community Today" className={inputClass} />
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">Primary language — translated to other languages automatically.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Subheadline</label>
                        <input type="text" value={subheadline} onChange={e => setSubheadline(e.target.value)}
                            placeholder="Where researchers, scientists, and innovators connect, learn, and grow together." className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Get access to exclusive courses, expert discussions, live events, and a network of brilliant minds."
                            rows={4} className={`${inputClass} resize-y`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">CTA Button Text</label>
                        <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
                            placeholder="Join Now" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Price (USD)</label>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500">$</span>
                                <input type="number" value={priceUsd} onChange={e => setPriceUsd(Number(e.target.value))}
                                    min={0} className={inputClass} />
                                <span className="text-xs text-gray-400 dark:text-neutral-500">/mo</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Price (EUR)</label>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500">€</span>
                                <input type="number" value={priceEur} onChange={e => setPriceEur(Number(e.target.value))}
                                    min={0} className={inputClass} />
                                <span className="text-xs text-gray-400 dark:text-neutral-500">/mo</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Video URLs</label>
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mb-2">YouTube, Vimeo, or Loom links.</p>
                        {videoUrls.map((url, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="url" value={url}
                                    onChange={e => { const n = [...videoUrls]; n[i] = e.target.value; setVideoUrls(n); }}
                                    placeholder="https://youtube.com/watch?v=..." className={`flex-1 ${inputClass}`} />
                                {videoUrls.length > 1 && (
                                    <button type="button" onClick={() => setVideoUrls(videoUrls.filter((_, j) => j !== i))}
                                        className="px-2 text-red-500 hover:text-red-700 text-sm">✕</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => setVideoUrls([...videoUrls, ''])}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">+ Add Video</button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Benefits / What You Get</label>
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mb-2">Each benefit will be auto-translated.</p>
                        {benefits.map((benefit, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="text" value={benefit}
                                    onChange={e => { const n = [...benefits]; n[i] = e.target.value; setBenefits(n); }}
                                    placeholder="Access to expert-led courses..." className={`flex-1 ${inputClass}`} />
                                {benefits.length > 1 && (
                                    <button type="button" onClick={() => setBenefits(benefits.filter((_, j) => j !== i))}
                                        className="px-2 text-red-500 hover:text-red-700 text-sm">✕</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => setBenefits([...benefits, ''])}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">+ Add Benefit</button>
                    </div>
                    <div className="pt-2">
                        <Button onClick={handleSaveEnglish} disabled={isPending} className="w-full">
                            {isPending ? 'Saving...' : 'Save English Content'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── TRANSLATION FORM (any non-EN language) ── */}
            {selectedLang !== 'en' && (
                <div className="space-y-5">
                    {/* Auto-Translate Button */}
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                        <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Auto-Translate from English</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                Translates all English content to {currentLangMeta?.label} via DeepL.
                            </p>
                        </div>
                        <Button
                            onClick={() => handleAutoTranslate(selectedLang)}
                            disabled={isTranslating || isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5"
                        >
                            {isTranslating ? '🔄 Translating...' : '🌐 Auto-Translate'}
                        </Button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Headline</label>
                        <input type="text" value={getTranslation(selectedLang).headline || ''}
                            onChange={e => updateTranslationField(selectedLang, 'headline', e.target.value)}
                            placeholder="Not yet translated — click Auto-Translate or enter manually" className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Subheadline</label>
                        <input type="text" value={getTranslation(selectedLang).subheadline || ''}
                            onChange={e => updateTranslationField(selectedLang, 'subheadline', e.target.value)}
                            placeholder="Not yet translated" className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Description</label>
                        <textarea value={getTranslation(selectedLang).description || ''}
                            onChange={e => updateTranslationField(selectedLang, 'description', e.target.value)}
                            placeholder="Not yet translated" rows={4} className={`${inputClass} resize-y`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">CTA Button Text</label>
                        <input type="text" value={getTranslation(selectedLang).ctaText || ''}
                            onChange={e => updateTranslationField(selectedLang, 'ctaText', e.target.value)}
                            placeholder="Not yet translated" className={inputClass} />
                    </div>

                    {/* Language-specific Video URLs */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                            Video URLs ({currentLangMeta?.label})
                        </label>
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mb-2">
                            Optional — leave empty to use English videos. Add language-specific videos here.
                        </p>
                        {(getTranslation(selectedLang).videoUrls?.length ? getTranslation(selectedLang).videoUrls! : ['']).map((url, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="url" value={url}
                                    onChange={e => {
                                        const current = getTranslation(selectedLang).videoUrls || [''];
                                        const newUrls = [...current]; newUrls[i] = e.target.value;
                                        updateTranslationField(selectedLang, 'videoUrls', newUrls);
                                    }}
                                    placeholder="https://youtube.com/watch?v=... (optional)" className={`flex-1 ${inputClass}`} />
                                {(getTranslation(selectedLang).videoUrls?.length || 1) > 1 && (
                                    <button type="button" onClick={() => {
                                        const current = getTranslation(selectedLang).videoUrls || [];
                                        updateTranslationField(selectedLang, 'videoUrls', current.filter((_, j) => j !== i));
                                    }} className="px-2 text-red-500 hover:text-red-700 text-sm">✕</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => {
                            const current = getTranslation(selectedLang).videoUrls || [''];
                            updateTranslationField(selectedLang, 'videoUrls', [...current, '']);
                        }} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">+ Add Video</button>
                    </div>

                    {/* Translated Benefits */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">Benefits / What You Get</label>
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mb-2">
                            Auto-translated from English. Edit individual items below.
                        </p>
                        {(getTranslation(selectedLang).benefits?.length ? getTranslation(selectedLang).benefits! : ['']).map((benefit, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="text" value={benefit}
                                    onChange={e => {
                                        const current = getTranslation(selectedLang).benefits || [''];
                                        const newBenefits = [...current]; newBenefits[i] = e.target.value;
                                        updateTranslationField(selectedLang, 'benefits', newBenefits);
                                    }}
                                    placeholder="Not yet translated" className={`flex-1 ${inputClass}`} />
                                {(getTranslation(selectedLang).benefits?.length || 1) > 1 && (
                                    <button type="button" onClick={() => {
                                        const current = getTranslation(selectedLang).benefits || [];
                                        updateTranslationField(selectedLang, 'benefits', current.filter((_, j) => j !== i));
                                    }} className="px-2 text-red-500 hover:text-red-700 text-sm">✕</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => {
                            const current = getTranslation(selectedLang).benefits || [''];
                            updateTranslationField(selectedLang, 'benefits', [...current, '']);
                        }} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">+ Add Benefit</button>
                    </div>

                    <div className="pt-2">
                        <Button onClick={() => handleSaveTranslation(selectedLang)} disabled={isPending} className="w-full">
                            {isPending ? 'Saving...' : `Save ${currentLangMeta?.label} Translation`}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
