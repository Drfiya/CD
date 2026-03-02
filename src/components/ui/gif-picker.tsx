'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface GiphyGif {
    id: string;
    title: string;
    images: {
        fixed_height: {
            url: string;
            width: string;
            height: string;
        };
        original: {
            url: string;
        };
        fixed_width_small: {
            url: string;
        };
    };
}

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
    onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

    const fetchTrending = useCallback(async () => {
        if (!apiKey) {
            setError('GIPHY API key not configured');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`
            );
            const data = await response.json();

            if (data.data) {
                setGifs(data.data);
                // Track GIPHY API usage
                fetch('/api/track-usage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ service: 'giphy', action: 'trending' }),
                }).catch(() => { });
            }
        } catch (err) {
            setError('Failed to load GIFs');
            console.error('GIPHY fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    // Fetch trending GIFs on initial load
    useEffect(() => {
        fetchTrending();
        inputRef.current?.focus();
    }, [fetchTrending]);

    const searchGifs = useCallback(async (searchQuery: string) => {
        if (!apiKey) return;

        if (!searchQuery.trim()) {
            fetchTrending();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`
            );
            const data = await response.json();

            if (data.data) {
                setGifs(data.data);
                // Track GIPHY API usage
                fetch('/api/track-usage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ service: 'giphy', action: 'search', metadata: { query: searchQuery } }),
                }).catch(() => { });
            }
        } catch (err) {
            setError('Failed to search GIFs');
            console.error('GIPHY search error:', err);
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    // Debounced search
    const handleSearchChange = (value: string) => {
        setQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            searchGifs(value);
        }, 300);
    };

    const handleSelectGif = (gif: GiphyGif) => {
        // Use the fixed_height URL for better performance
        onSelect(gif.images.fixed_height.url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Select a GIF</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search input */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search GIFs..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                        />
                    </div>
                </div>

                {/* GIF grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>{error}</p>
                        </div>
                    ) : gifs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>No GIFs found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {gifs.map((gif) => (
                                <button
                                    key={gif.id}
                                    onClick={() => handleSelectGif(gif)}
                                    className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all group"
                                >
                                    <img
                                        src={gif.images.fixed_width_small.url}
                                        alt={gif.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* GIPHY attribution */}
                <div className="p-3 border-t border-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-400">Powered by</span>
                    <img
                        src="https://giphy.com/static/img/giphy-logo.c0e5c1.svg"
                        alt="GIPHY"
                        className="h-4 ml-1"
                    />
                </div>
            </div>
        </div>
    );
}
