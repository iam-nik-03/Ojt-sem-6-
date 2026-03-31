import { api } from './api';

export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle "youtube:ID" format used internally
  if (url.startsWith('youtube:')) return url.split(':')[1];
  
  // Standard YouTube URL regex patterns
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/ // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1] || match[0];
  }

  return null;
}

export function extractPlaylistId(url: string): string | null {
  if (!url) return null;
  
  // Handle full URL
  const regex = /[&?]list=([^&]+)/i;
  const match = url.match(regex);
  if (match) return match[1];
  
  // Handle just ID (starts with PL or similar, usually 34 chars)
  const trimmed = url.trim();
  if (trimmed.length >= 10 && (
    trimmed.startsWith('PL') || 
    trimmed.startsWith('UU') || 
    trimmed.startsWith('FL') || 
    trimmed.startsWith('LP') ||
    /^[a-zA-Z0-9_-]{10,}$/.test(trimmed)
  )) {
    return trimmed;
  }
  
  return null;
}

export async function fetchYoutubePlaylist(playlistId: string) {
  const { data, error } = await api.get<any>(`/api/youtube/playlist/${playlistId}`);
  
  if (error || !data) {
    throw new Error(error || "Failed to fetch playlist details from server.");
  }
  
  return {
    title: data.title,
    thumbnail: data.thumbnail,
    videos: data.videos.map((v: any) => ({
      videoId: v.id,
      title: v.title,
      thumbnail: v.thumbnail,
      position: v.orderIndex,
      duration: 0
    }))
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
