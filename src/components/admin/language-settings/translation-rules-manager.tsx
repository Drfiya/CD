'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    createTranslationRule,
    updateTranslationRule,
    deleteTranslationRule,
    type TranslationRuleData,
} from '@/lib/language-settings/actions';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCALE_OPTIONS = [
    { value: 'en', label: 'English (en)' },
    { value: 'de', label: 'German (de)' },
    { value: 'fr', label: 'French (fr)' },
    { value: 'es', label: 'Spanish (es)' },
    { value: 'it', label: 'Italian (it)' },
    { value: 'pt', label: 'Portuguese (pt)' },
    { value: 'nl', label: 'Dutch (nl)' },
    { value: 'pl', label: 'Polish (pl)' },
    { value: 'ja', label: 'Japanese (ja)' },
    { value: 'zh', label: 'Chinese (zh)' },
    { value: 'ko', label: 'Korean (ko)' },
    { value: 'ru', label: 'Russian (ru)' },
];

const FORMALITY_OPTIONS = [
    { value: 'more', label: 'More formal' },
    { value: 'less', label: 'Less formal' },
    { value: 'default', label: 'Default' },
];

// ─── Style constants ─────────────────────────────────────────────────────────

const CARD_CLASS =
    'bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5';

const LABEL_CLASS =
    'block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1';

const INPUT_CLASS =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition';

const SELECT_CLASS = INPUT_CLASS;

const PRIMARY_BTN_CLASS =
    'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50';

const SECONDARY_BTN_CLASS =
    'px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors';

// ─── Props ───────────────────────────────────────────────────────────────────

interface TranslationRulesManagerProps {
    initialRules: TranslationRuleData[];
    domains: string[];
}

// ─── Rule Card ───────────────────────────────────────────────────────────────

function RuleCard({
    rule,
    domains,
    onSaved,
    onDeleted,
}: {
    rule: TranslationRuleData;
    domains: string[];
    onSaved: () => void;
    onDeleted: () => void;
}) {
    const [formality, setFormality] = useState(rule.formality);
    const [defaultPreviewLocale, setDefaultPreviewLocale] = useState(
        rule.defaultPreviewLocale
    );
    const [activeGlossaryDomain, setActiveGlossaryDomain] = useState(
        rule.activeGlossaryDomain ?? ''
    );
    const [autoTranslate, setAutoTranslate] = useState(rule.autoTranslate);
    const [qualityThreshold, setQualityThreshold] = useState(
        rule.qualityThreshold
    );
    const [cacheTtlDays, setCacheTtlDays] = useState(rule.cacheTtlDays);
    const [contextDepth, setContextDepth] = useState(rule.contextDepth);
    const [isActive, setIsActive] = useState(rule.isActive);

    const [isPending, startTransition] = useTransition();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    function handleSave() {
        startTransition(async () => {
            try {
                await updateTranslationRule(rule.id, {
                    formality,
                    defaultPreviewLocale,
                    activeGlossaryDomain: activeGlossaryDomain || null,
                    autoTranslate,
                    qualityThreshold,
                    cacheTtlDays,
                    contextDepth,
                    isActive,
                });
                toast.success(`Rule "${rule.sectionName}" updated`);
                onSaved();
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to update rule'
                );
            }
        });
    }

    function handleDelete() {
        startTransition(async () => {
            try {
                await deleteTranslationRule(rule.id);
                toast.success(`Rule "${rule.sectionName}" deleted`);
                onDeleted();
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to delete rule'
                );
            }
        });
    }

    return (
        <div className={CARD_CLASS}>
            {/* Card header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                        {rule.sectionName}
                    </h3>
                    <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-neutral-400'
                        }`}
                    >
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending}
                        className={PRIMARY_BTN_CLASS}
                        style={{ backgroundColor: '#D94A4A' }}
                    >
                        {isPending ? 'Saving...' : 'Save'}
                    </button>

                    {!showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className={SECONDARY_BTN_CLASS}
                        >
                            Delete
                        </button>
                    ) : (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isPending}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                Confirm
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className={SECONDARY_BTN_CLASS}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Formality */}
                <div>
                    <label className={LABEL_CLASS}>Formality</label>
                    <select
                        value={formality}
                        onChange={(e) => setFormality(e.target.value)}
                        className={SELECT_CLASS}
                    >
                        {FORMALITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Default Preview Locale */}
                <div>
                    <label className={LABEL_CLASS}>Default Preview Locale</label>
                    <select
                        value={defaultPreviewLocale}
                        onChange={(e) => setDefaultPreviewLocale(e.target.value)}
                        className={SELECT_CLASS}
                    >
                        {LOCALE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Active Glossary Domain */}
                <div>
                    <label className={LABEL_CLASS}>Active Glossary Domain</label>
                    <select
                        value={activeGlossaryDomain}
                        onChange={(e) => setActiveGlossaryDomain(e.target.value)}
                        className={SELECT_CLASS}
                    >
                        <option value="">None</option>
                        {domains.map((domain) => (
                            <option key={domain} value={domain}>
                                {domain}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Auto-Translate toggle */}
                <div>
                    <label className={LABEL_CLASS}>Auto-Translate</label>
                    <button
                        type="button"
                        onClick={() => setAutoTranslate(!autoTranslate)}
                        className={`relative inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                            autoTranslate
                                ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : 'border-gray-200 bg-white text-gray-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
                        }`}
                    >
                        <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                                autoTranslate ? 'bg-green-500' : 'bg-gray-300 dark:bg-neutral-500'
                            }`}
                        />
                        {autoTranslate ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Quality Threshold */}
                <div>
                    <label className={LABEL_CLASS}>Quality Threshold</label>
                    <input
                        type="number"
                        value={qualityThreshold}
                        onChange={(e) =>
                            setQualityThreshold(
                                Math.min(1, Math.max(0, parseFloat(e.target.value) || 0))
                            )
                        }
                        min={0}
                        max={1}
                        step={0.1}
                        className={INPUT_CLASS}
                    />
                </div>

                {/* Cache TTL (days) */}
                <div>
                    <label className={LABEL_CLASS}>Cache TTL (days)</label>
                    <input
                        type="number"
                        value={cacheTtlDays}
                        onChange={(e) =>
                            setCacheTtlDays(
                                Math.min(365, Math.max(1, parseInt(e.target.value, 10) || 1))
                            )
                        }
                        min={1}
                        max={365}
                        className={INPUT_CLASS}
                    />
                </div>

                {/* Context Depth */}
                <div>
                    <label className={LABEL_CLASS}>Context Depth</label>
                    <input
                        type="number"
                        value={contextDepth}
                        onChange={(e) =>
                            setContextDepth(
                                Math.min(5, Math.max(0, parseInt(e.target.value, 10) || 0))
                            )
                        }
                        min={0}
                        max={5}
                        className={INPUT_CLASS}
                    />
                </div>

                {/* Active toggle */}
                <div>
                    <label className={LABEL_CLASS}>Active</label>
                    <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className={`relative inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                            isActive
                                ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : 'border-gray-200 bg-white text-gray-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
                        }`}
                    >
                        <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                                isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-neutral-500'
                            }`}
                        />
                        {isActive ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TranslationRulesManager({
    initialRules,
    domains,
}: TranslationRulesManagerProps) {
    const router = useRouter();
    const [rules, setRules] = useState<TranslationRuleData[]>(initialRules);
    const [newSectionName, setNewSectionName] = useState('');
    const [isPending, startTransition] = useTransition();

    function refresh() {
        router.refresh();
    }

    function handleCreateRule() {
        const trimmed = newSectionName.trim();
        if (!trimmed) {
            toast.error('Section name is required');
            return;
        }

        // Prevent duplicates
        if (rules.some((r) => r.sectionName.toLowerCase() === trimmed.toLowerCase())) {
            toast.error(`A rule for "${trimmed}" already exists`);
            return;
        }

        startTransition(async () => {
            try {
                const created = await createTranslationRule({
                    sectionName: trimmed,
                });
                setRules((prev) => [...prev, created as TranslationRuleData]);
                setNewSectionName('');
                toast.success(`Rule "${trimmed}" created`);
                refresh();
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to create rule'
                );
            }
        });
    }

    function handleRuleDeleted(id: string) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        refresh();
    }

    return (
        <div className="space-y-6">
            {/* ── Add new rule ─────────────────────────────────────────────── */}
            <div className={CARD_CLASS}>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">
                    Add New Rule
                </h2>
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className={LABEL_CLASS}>Section Name</label>
                        <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="e.g. Blog Posts, Forum, Documentation..."
                            className={INPUT_CLASS}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateRule();
                                }
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleCreateRule}
                        disabled={isPending || !newSectionName.trim()}
                        className={PRIMARY_BTN_CLASS}
                        style={{ backgroundColor: '#D94A4A' }}
                    >
                        {isPending ? 'Creating...' : 'Add Rule'}
                    </button>
                </div>
            </div>

            {/* ── Rules list ──────────────────────────────────────────────── */}
            {rules.length === 0 ? (
                <div className={CARD_CLASS}>
                    <p className="text-sm text-gray-500 dark:text-neutral-400 text-center py-8">
                        No translation rules configured yet. Add a section above to
                        get started.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {rules.map((rule) => (
                        <RuleCard
                            key={rule.id}
                            rule={rule}
                            domains={domains}
                            onSaved={refresh}
                            onDeleted={() => handleRuleDeleted(rule.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
