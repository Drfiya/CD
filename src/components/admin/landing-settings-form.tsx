'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    updateLandingPageSettings,
    type CommunitySettings,
} from '@/lib/settings-actions';

interface LandingSettingsFormProps {
    settings: CommunitySettings;
}

export function LandingSettingsForm({ settings }: LandingSettingsFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

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
        settings.landingBenefits.length > 0 ? settings.landingBenefits : ['']
    );

    function handleSave() {
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
                toast.success('Landing page settings saved');
                router.refresh();
            }
        });
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Landing Page Settings</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Configure the public landing page visitors see before logging in.
                </p>
            </div>

            {/* Headline */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                <input
                    type="text"
                    value={headline}
                    onChange={e => setHeadline(e.target.value)}
                    placeholder="Join the Science Experts Community"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-translated for visitors in other languages.</p>
            </div>

            {/* Subheadline */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                <input
                    type="text"
                    value={subheadline}
                    onChange={e => setSubheadline(e.target.value)}
                    placeholder="Where researchers, scientists, and innovators connect..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Get access to exclusive courses, expert discussions..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Save */}
            <div className="pt-2">
                <Button onClick={handleSave} disabled={isPending} className="w-full">
                    {isPending ? 'Saving...' : 'Save Landing Page Settings'}
                </Button>
            </div>
        </div>
    );
}
