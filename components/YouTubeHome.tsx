import React, { useState, useEffect } from 'react';

const ENV_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export const YouTubeHome = ({ navigate }: { navigate: any }) => {
    const [apiKey, setApiKey] = useState(ENV_API_KEY || localStorage.getItem('youtube_api_key') || '');
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false); // Initially false if no API key
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    
    const categories = ['All', 'Physics', 'Chemistry', 'Math', 'BSEB Updates'];

    // Setup state for user entering the key
    const [tempApiKey, setTempApiKey] = useState('');
    const showApiKeyInput = !apiKey;

    useEffect(() => {
        if (!apiKey) return; // Wait until API key is available

        const fetchVideos = async () => {
            setLoading(true);
            try {
                let currentQuery = searchQuery;
                if (!currentQuery) {
                    currentQuery = activeCategory === 'All' ? 'Bihar Board Class 12 Educational Videos' : activeCategory;
                }
                const q = `&q=${encodeURIComponent(currentQuery)}`;
                const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&type=video${q}&key=${apiKey.trim()}`;
                
                const response = await fetch(url);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (data.items) {
                    // Fetch channel avatars
                    const channelIds = [...new Set(data.items.map((item: any) => item.snippet.channelId))].join(',');
                    let channelMap: Record<string, string> = {};
                    
                    if (channelIds) {
                        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${apiKey.trim()}`;
                        const channelResponse = await fetch(channelUrl);
                        if (channelResponse.ok) {
                            const channelData = await channelResponse.json();
                            if (channelData.items) {
                                channelData.items.forEach((channel: any) => {
                                    channelMap[channel.id] = channel.snippet.thumbnails.default.url;
                                });
                            }
                        }
                    }

                    const formattedVideos = data.items.map((item: any) => ({
                        id: item.id.videoId || item.id,
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails.high.url,
                        channelTitle: item.snippet.channelTitle,
                        channelAvatar: channelMap[item.snippet.channelId] || '',
                        publishedAt: item.snippet.publishedAt
                    }));

                    setVideos(formattedVideos);
                }
            } catch (error: any) {
                console.error("Error fetching YouTube videos:", error.message || error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [searchQuery, activeCategory, apiKey]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setActiveCategory('');
    };

    const handleCategoryClick = (category: string) => {
        setActiveCategory(category);
        setSearchQuery('');
        setSearchInput('');
    };

    const handleSaveApiKey = (e: React.FormEvent) => {
        e.preventDefault();
        if (tempApiKey.trim()) {
            localStorage.setItem('youtube_api_key', tempApiKey.trim());
            setApiKey(tempApiKey.trim());
        }
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
        
        if (seconds < 60) return `${seconds} seconds ago`;
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.round(hours / 24);
        if (days < 30) return `${days} days ago`;
        const months = Math.round(days / 30);
        if (months < 12) return `${months} months ago`;
        const years = Math.round(days / 365);
        return `${years} years ago`;
    };

    if (showApiKeyInput) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                    <div className="flex items-center gap-3 mb-6 justify-center">
                        <i className="fa-brands fa-youtube text-red-600 text-4xl"></i>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">YouTube Setup</h2>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-center mb-6">
                        Please enter your YouTube Data API v3 key to continue. It will be saved securely in your browser.
                    </p>
                    <form onSubmit={handleSaveApiKey} className="flex flex-col gap-4">
                        <input 
                            type="password" 
                            placeholder="Enter API Key here..."
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-red-500 dark:focus:border-red-500 transition-colors dark:text-white"
                            required
                        />
                        <button type="submit" className="w-full bg-red-600 text-white font-bold rounded-xl py-3 shadow-lg hover:bg-red-700 transition-colors">
                            Save Key & Continue
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Top Navigation */}
            <div className="sticky top-0 z-50 px-4 py-2 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 -ml-2 rounded-full active:bg-slate-100 dark:active:bg-slate-900 lg:hidden">
                        <i className="fa-solid fa-bars text-xl"></i>
                    </button>
                    <div className="flex items-center gap-1">
                        <i className="fa-brands fa-youtube text-red-600 text-3xl"></i>
                        <span className="text-xl font-bold tracking-tighter dark:text-white hidden sm:block">YouTube</span>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex items-center">
                    <div className="flex flex-1 items-center border border-slate-300 dark:border-slate-700 rounded-l-full bg-white dark:bg-slate-900 px-4 py-1.5 focus-within:border-blue-500 ml-0 sm:ml-4">
                        <i className="fa-solid fa-magnifying-glass text-slate-400 mr-2"></i>
                        <input 
                            type="text" 
                            placeholder="Search" 
                            className="w-full bg-transparent outline-none dark:text-white"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-full px-5 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <i className="fa-solid fa-magnifying-glass text-slate-600 dark:text-slate-300"></i>
                    </button>
                    <button type="button" className="ml-4 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors hidden sm:flex">
                        <i className="fa-solid fa-microphone text-slate-900 dark:text-white"></i>
                    </button>
                </form>

                <div className="flex items-center gap-4">
                    <button className="hidden sm:block text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full">
                        <i className="fa-solid fa-video"></i>
                    </button>
                    <button className="hidden sm:block text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full">
                        <i className="fa-regular fa-bell"></i>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                        P
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-slate-50 dark:bg-slate-950 pb-[calc(5rem+env(safe-area-inset-bottom))]">
                {/* Category Chips */}
                <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 overflow-x-auto hide-scrollbar border-b border-slate-200 dark:border-slate-800 mb-4 sm:mb-6">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => handleCategoryClick(category)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                activeCategory === category 
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-8 max-w-screen-2xl mx-auto px-4">
                    {loading ? (
                        /* Skeleton Loader */
                        Array.from({ length: 12 }).map((_, idx) => (
                            <div key={idx} className="flex flex-col gap-3 animate-pulse">
                                <div className="w-full aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                                <div className="flex gap-3 px-1 mt-1">
                                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                        <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                        <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded mt-1"></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : videos.length > 0 ? (
                        videos.map((video) => (
                            <div key={video.id} className="flex flex-col gap-3 group cursor-pointer">
                                <div className="w-full aspect-video rounded-xl overflow-hidden relative bg-slate-200 dark:bg-slate-800">
                                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                </div>
                                <div className="flex gap-3 px-1 mt-1">
                                    <img src={video.channelAvatar || 'https://via.placeholder.com/36'} alt={video.channelTitle} className="w-9 h-9 rounded-full shrink-0 object-cover bg-slate-200 dark:bg-slate-800" />
                                    <div className="flex flex-col">
                                        <h3 className="text-slate-900 dark:text-white font-semibold text-[15px] leading-tight line-clamp-2" dangerouslySetInnerHTML={{ __html: video.title }}></h3>
                                        <div className="text-slate-500 dark:text-slate-400 text-[13px] mt-1.5 flex flex-col sm:flex-row sm:items-center sm:gap-1 font-medium">
                                            <span className="hover:text-slate-700 dark:hover:text-slate-300">{video.channelTitle}</span>
                                            <span className="hidden sm:inline">•</span>
                                            <span>{timeAgo(video.publishedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                            <i className="fa-solid fa-search text-4xl mb-4"></i>
                            <p className="text-lg">No videos found. Try a different search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
