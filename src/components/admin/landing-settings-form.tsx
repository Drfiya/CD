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

interface LandingSettingsFormProps {
    settings: CommunitySettings;
}

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
];

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
    const [activeTab, setActiveTab] = useState('en');
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
                toast.success(`${LANGUAGES.find(l => l.code === lang)?.label} translation saved`);
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
                        // Keep existing video URLs (they're not translatable)
                        videoUrls: prev[lang]?.videoUrls || [],
                    },
                }));
                toast.success(`Auto-translated to ${LANGUAGES.find(l => l.code === lang)?.label}`);
            }
        } catch {
            toast.error('Translation failed');
        } finally {
            setIsTranslating(false);
        }
    }

    // ── Shared input styles ──
    const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Landing Page Settings</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Configure the public landing page. Use tabs to manage translations.
                </p>
            </div>

            {/* ── Language Tab Bar ── */}
            <div className="flex border-b border-gray-200">
                {LANGUAGES.map(lang => (
                    <button
                        key={lang.code}
                        onClick={() => setActiveTab(lang.code)}
                        className={`
                            px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                            ${activeTab === lang.code
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <span className="mr-1.5">{lang.flag}</span>
                        {lang.label}
                        {lang.code !== 'en' && translations[lang.code] && (
                            <span className="ml-1.5 w-2 h-2 bg-green-400 rounded-full inline-block" title="Has translation" />
                        )}
                    </button>
                ))}
            </div>

            {/* ── ENGLISH TAB ── */}
            {activeTab === 'en' && (
                <div className="space-y-5">
                    {/* Headline */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                        <input
                            type="text"
                            value={headline}
                            onChange={e => setHeadline(e.target.value)}
                            placeholder="Join the Science Experts Community Today"
                            className={inputClass}
                        />
                        <p className="text-xs text-gray-400 mt-1">Primary language — auto-translated to other tabs.</p>
                    </div>

                    {/* Subheadline */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                        <input
                            type="text"
                            value={subheadline}
                            onChange={e => setSubheadline(e.target.value)}
                            placeholder="Where researchers, scientists, and innovators connect, learn, and grow together."
                            className={inputClass}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Get access to exclusive courses, expert discussions, live events, and a network of brilliant minds. Whether you're a seasoned researcher or an aspiring scientist — this is your community."
                            rows={4}
                            className={`${inputClass} resize-y`}
                        />
                    </div>

                    {/* CTA Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                        <input
                            type="text"
                            value={ctaText}
                            onChange={e => setCtaText(e.target.value)}
                            placeholder="Join Now"
                            className={inputClass}
                        />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (USD)</label>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500">$</span>
                                <input
                                    type="number"
                                    value={priceUsd}
                                    onChange={e => setPriceUsd(Number(e.target.value))}
                                    min={0}
                                    className={inputClass}
                                />
                                <span className="text-xs text-gray-400">/mo</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (EUR)</label>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500">€</span>
                                <input
                                    type="number"
                                    value={priceEur}
                                    onChange={e => setPriceEur(Number(e.target.value))}
                                    min={0}
                                    className={inputClass}
                                />
                                <span className="text-xs text-gray-400">/mo</span>
                            </div>
                        </div>
                    </div>

                    {/* Video URLs */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Video URLs</label>
                        <p className="text-xs text-gray-400 mb-2">YouTube, Vimeo, or Loom links.</p>
                        {videoUrls.map((url, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={e => {
                                        const newUrls = [...videoUrls];
                                        newUrls[i] = e.target.value;
                                        setVideoUrls(newUrls);
                                    }}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className={`flex-1 ${inputClass}`}
                                />
                                {videoUrls.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setVideoUrls(videoUrls.filter((_, j) => j !== i))}
                                        className="px-2 text-red-500 hover:text-red-700 text-sm"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setVideoUrls([...videoUrls, ''])}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Add Video
                        </button>
                    </div>

                    {/* Benefits */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Benefits / What You Get</label>
                        <p className="text-xs text-gray-400 mb-2">Each benefit will be auto-translated.</p>
                        {benefits.map((benefit, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={benefit}
                                    onChange={e => {
                                        const newBenefits = [...benefits];
                                        newBenefits[i] = e.target.value;
                                        setBenefits(newBenefits);
                                    }}
                                    placeholder="Access to expert-led courses..."
                                    className={`flex-1 ${inputClass}`}
                                />
                                {benefits.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setBenefits(benefits.filter((_, j) => j !== i))}
                                        className="px-2 text-red-500 hover:text-red-700 text-sm"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setBenefits([...benefits, ''])}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Add Benefit
                        </button>
                    </div>

                    {/* Save English */}
                    <div className="pt-2">
                        <Button onClick={handleSaveEnglish} disabled={isPending} className="w-full">
                            {isPending ? 'Saving...' : 'Save English Content'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── TRANSLATION TABS (DE / FR / ES) ── */}
            {activeTab !== 'en' && (
                <div className="space-y-5">
                    {/* Auto-Translate Button */}
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div>
                            <p className="text-sm font-medium text-blue-900">Auto-Translate from English</p>
                            <p className="text-xs text-blue-600">
                                Translates all English content to {LANGUAGES.find(l => l.code === activeTab)?.label} via DeepL.
                            </p>
                        </div>
                        <Button
                            onClick={() => handleAutoTranslate(activeTab)}
                            disabled={isTranslating || isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5"
                        >
                            {isTranslating ? '🔄 Translating...' : '🌐 Auto-Translate'}
                        </Button>
                    </div>

                    {/* Translated Headline */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                        <input
                            type="text"
                            value={getTranslation(activeTab).headline || ''}
                            onChange={e => updateTranslationField(activeTab, 'headline', e.target.value)}
                            placeholder="Not yet translated — click Auto-Translate or enter manually"
                            className={inputClass}
                        />
                    </div>

                    {/* Translated Subheadline */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                        <input
                            type="text"
                            value={getTranslation(activeTab).subheadline || ''}
                            onChange={e => updateTranslationField(activeTab, 'subheadline', e.target.value)}
                            placeholder="Not yet translated"
                            className={inputClass}
                        />
                    </div>

                    {/* Translated Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={getTranslation(activeTab).description || ''}
                            onChange={e => updateTranslationField(activeTab, 'description', e.target.value)}
                            placeholder="Not yet translated"
                            rows={4}
                            className={`${inputClass} resize-y`}
                        />
                    </div>

                    {/* Translated CTA */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                        <input
                            type="text"
                            value={getTranslation(activeTab).ctaText || ''}
                            onChange={e => updateTranslationField(activeTab, 'ctaText', e.target.value)}
                            placeholder="Not yet translated"
                            className={inputClass}
                        />
                    </div>

                    {/* Language-specific Video URLs */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Video URLs ({LANGUAGES.find(l => l.code === activeTab)?.label})
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Optional — leave empty to use English videos. Add language-specific videos here.
                        </p>
                        {(getTranslation(activeTab).videoUrls?.length ? getTranslation(activeTab).videoUrls! : ['']).map((url, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={e => {
                                        const current = getTranslation(activeTab).videoUrls || [''];
                                        const newUrls = [...current];
                                        newUrls[i] = e.target.value;
                                        updateTranslationField(activeTab, 'videoUrls', newUrls);
                                    }}
                                    placeholder="https://youtube.com/watch?v=... (optional)"
                                    className={`flex-1 ${inputClass}`}
                                />
                                {(getTranslation(activeTab).videoUrls?.length || 1) > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = getTranslation(activeTab).videoUrls || [];
                                            updateTranslationField(activeTab, 'videoUrls', current.filter((_, j) => j !== i));
                                        }}
                                        className="px-2 text-red-500 hover:text-red-700 text-sm"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const current = getTranslation(activeTab).videoUrls || [''];
                                updateTranslationField(activeTab, 'videoUrls', [...current, '']);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Add Video
                        </button>
                    </div>

                    {/* Translated Benefits */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Benefits / What You Get</label>
                        <p className="text-xs text-gray-400 mb-2">
                            Auto-translated from English. Edit individual items below.
                        </p>
                        {(getTranslation(activeTab).benefits?.length ? getTranslation(activeTab).benefits! : ['']).map((benefit, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={benefit}
                                    onChange={e => {
                                        const current = getTranslation(activeTab).benefits || [''];
                                        const newBenefits = [...current];
                                        newBenefits[i] = e.target.value;
                                        updateTranslationField(activeTab, 'benefits', newBenefits);
                                    }}
                                    placeholder="Not yet translated"
                                    className={`flex-1 ${inputClass}`}
                                />
                                {(getTranslation(activeTab).benefits?.length || 1) > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = getTranslation(activeTab).benefits || [];
                                            updateTranslationField(activeTab, 'benefits', current.filter((_, j) => j !== i));
                                        }}
                                        className="px-2 text-red-500 hover:text-red-700 text-sm"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const current = getTranslation(activeTab).benefits || [''];
                                updateTranslationField(activeTab, 'benefits', [...current, '']);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Add Benefit
                        </button>
                    </div>

                    {/* Save Translation */}
                    <div className="pt-2">
                        <Button onClick={() => handleSaveTranslation(activeTab)} disabled={isPending} className="w-full">
                            {isPending
                                ? 'Saving...'
                                : `Save ${LANGUAGES.find(l => l.code === activeTab)?.label} Translation`
                            }
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
