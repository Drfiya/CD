'use client';

import { useState } from 'react';

interface LandingVideoPlayerProps {
    videoUrls: string[];
}

function getVideoEmbed(url: string) {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
        return {
            service: 'youtube' as const,
            id: ytMatch[1],
            embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
            thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
        };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return {
            service: 'vimeo' as const,
            id: vimeoMatch[1],
            embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
            thumbnailUrl: null,
        };
    }

    // Loom
    const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/);
    if (loomMatch) {
        return {
            service: 'loom' as const,
            id: loomMatch[1],
            embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
            thumbnailUrl: `https://cdn.loom.com/sessions/thumbnails/${loomMatch[1]}-with-play.gif`,
        };
    }

    return null;
}

export function LandingVideoPlayer({ videoUrls }: LandingVideoPlayerProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    const videos = videoUrls
        .map(url => getVideoEmbed(url))
        .filter((v): v is NonNullable<typeof v> => v !== null);

    if (videos.length === 0) return null;

    const activeVideo = videos[activeIndex];

    return (
        <div className="landing-video-section">
            {/* Main Video */}
            <div className="landing-video-main">
                <iframe
                    src={activeVideo.embedUrl}
                    title="Community Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="landing-video-iframe"
                />
            </div>

            {/* Thumbnail Strip */}
            {videos.length > 1 && (
                <div className="landing-video-thumbnails">
                    {videos.map((video, index) => (
                        <button
                            key={video.id}
                            onClick={() => setActiveIndex(index)}
                            className={`landing-video-thumb ${index === activeIndex ? 'active' : ''}`}
                        >
                            {video.thumbnailUrl ? (
                                <img
                                    src={video.thumbnailUrl}
                                    alt={`Video ${index + 1}`}
                                    className="landing-video-thumb-img"
                                />
                            ) : (
                                <div className="landing-video-thumb-placeholder">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                    </svg>
                                </div>
                            )}
                            {index === activeIndex && <div className="landing-video-thumb-active-border" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
