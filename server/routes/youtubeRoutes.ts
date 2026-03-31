import { Router } from "express";

const router = Router();

// Simple in-memory cache to preserve API quota
const searchCache = new Map<string, { data: any, timestamp: number }>();
const playlistCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Helper to get and sanitize the YouTube API key from environment variables.
 */
const getApiKey = () => {
  let source = "none";
  let rawKey = "";

  // Check multiple possible environment variable names
  if (process.env.YOUTUBE_API_KEY) {
    rawKey = process.env.YOUTUBE_API_KEY;
    source = "YOUTUBE_API_KEY";
  } else if (process.env.VITE_YOUTUBE_API_KEY) {
    rawKey = process.env.VITE_YOUTUBE_API_KEY;
    source = "VITE_YOUTUBE_API_KEY";
  } else if (process.env.VITE_GOOGLE_DRIVE_API_KEY) {
    rawKey = process.env.VITE_GOOGLE_DRIVE_API_KEY;
    source = "VITE_GOOGLE_DRIVE_API_KEY";
  } else if (process.env.GOOGLE_API_KEY) {
    rawKey = process.env.GOOGLE_API_KEY;
    source = "GOOGLE_API_KEY";
  }

  // Thoroughly sanitize the key (remove quotes, whitespace, and leading/trailing equals signs)
  const key = rawKey.trim().replace(/^=+|['"\s]|(=+$)/g, '');
  
  if (!key || key === "undefined" || key === "null") {
    return { key: null, source: rawKey ? `invalid_literal (${rawKey})` : "missing" };
  }

  return { key, source };
};

/**
 * GET /api/youtube/search
 * Searches for YouTube playlists using direct fetch to avoid library-specific auth issues.
 */
router.get("/search", async (req, res) => {
  const { q } = req.query;
  const { key: apiKey, source } = getApiKey();

  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const queryStr = q as string;

  // Check cache first
  const cached = searchCache.get(queryStr);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[YouTube Search] Returning cached results for: "${queryStr}"`);
    return res.json(cached.data);
  }

  if (!apiKey) {
    console.error(`[YouTube Search] API key is missing. Source: ${source}`);
    return res.status(500).json({ 
      error: "YouTube API key not configured. Please check your .env file.",
      details: `Source: ${source}`
    });
  }

  try {
    console.log(`[YouTube Search] Query: "${q}" | Key Source: ${source} | Key Prefix: ${apiKey.substring(0, 6)}...`);
    
    // 1. Search for playlists using direct fetch
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryStr)}&type=playlist&maxResults=12&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'x-goog-api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      const reason = searchData.error?.errors?.[0]?.reason || "unknown";
      const message = searchData.error?.message || "YouTube API search failed";
      
      console.error(`[YouTube Search] API Error (${reason}):`, message);
      
      if (reason === 'quotaExceeded' || reason === 'keyInvalid' || reason === 'accessNotConfigured') {
        console.log(`[YouTube Search] Falling back to mock data due to: ${reason}`);
        
        // High-quality mock data for demo purposes
        const mockData = [
          {
            id: "PL4Gr5tOafJJ7a29W63VXC_L-0p9a_Y9bJ",
            title: "React.js Full Course 2024",
            description: "Master React.js with this comprehensive course covering hooks, state management, and modern patterns.",
            thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
            channelTitle: "CodeAcademy",
            videoCount: 45,
            isMock: true
          },
          {
            id: "PL0Zuz27SZ-6PrE9srvEn8NBhOOyxPa1me",
            title: "Python for Data Science",
            description: "Learn Python from scratch with a focus on data analysis, visualization, and machine learning.",
            thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
            channelTitle: "DataWiz",
            videoCount: 32,
            isMock: true
          },
          {
            id: "PLTjRvDozrdlxjQ2Gph9f9UXas95Sa95Sa",
            title: "UI/UX Design Principles",
            description: "A complete guide to modern UI/UX design, from wireframing to high-fidelity prototyping.",
            thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?w=800&q=80",
            channelTitle: "DesignPro",
            videoCount: 28,
            isMock: true
          },
          {
            id: "PLu0W_9lII9agpFUAlPFe_VNSlXW5uE027",
            title: "Web Development Bootcamp",
            description: "The only course you need to learn web development - HTML, CSS, JS, Node, and more.",
            thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
            channelTitle: "WebDevSimplified",
            videoCount: 120,
            isMock: true
          },
          {
            id: "PL4Gr5tOafJJ6jS_S6S_S6S_S6S_S6S_S6",
            title: "Advanced TypeScript Patterns",
            description: "Deep dive into TypeScript's advanced type system and design patterns for scalable apps.",
            thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80",
            channelTitle: "TSMastery",
            videoCount: 15,
            isMock: true
          },
          {
            id: "PL0Zuz27SZ-6P4dHuY6nre7W74_V_V_V_V",
            title: "Machine Learning with TensorFlow",
            description: "Build and deploy machine learning models using TensorFlow and Keras.",
            thumbnail: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80",
            channelTitle: "AI Lab",
            videoCount: 50,
            isMock: true
          }
        ];

        // Filter mock data based on query if possible, or just return it all
        const filteredMock = mockData.filter(item => 
          item.title.toLowerCase().includes(queryStr.toLowerCase()) || 
          item.description.toLowerCase().includes(queryStr.toLowerCase())
        );

        const finalMock = filteredMock.length > 0 ? filteredMock : mockData;
        
        // Cache the mock results
        searchCache.set(queryStr, { data: finalMock, timestamp: Date.now() });
        return res.json(finalMock);
      }
      
      return res.status(searchResponse.status).json({ 
        error: message,
        details: `Reason: ${reason}`,
        reason: reason
      });
    }

    const searchItems = searchData.items || [];
    console.log(`[YouTube Search] Found ${searchItems.length} initial results`);
    
    if (searchItems.length === 0) {
      return res.json([]);
    }

    // 2. Get detailed info for these playlists (to get video counts)
    const playlistIds = searchItems
      .map((item: any) => item.id?.playlistId)
      .filter((id: any): id is string => !!id);
    
    if (playlistIds.length === 0) {
      return res.json([]);
    }

    const detailsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistIds.join(',')}&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'x-goog-api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    const detailsData = await detailsResponse.json();

    if (!detailsResponse.ok) {
      const reason = detailsData.error?.errors?.[0]?.reason || "unknown";
      const message = detailsData.error?.message || "YouTube API details fetch failed";
      
      console.error(`[YouTube Details] API Error (${reason}):`, message);
      
      if (reason === 'quotaExceeded' || reason === 'keyInvalid' || reason === 'accessNotConfigured') {
        console.log(`[YouTube Details] Falling back to mock data due to: ${reason}`);
        // Return the same mock data as the search fallback
        const mockData = [
          {
            id: "PL4Gr5tOafJJ7a29W63VXC_L-0p9a_Y9bJ",
            title: "React.js Full Course 2024",
            description: "Master React.js with this comprehensive course covering hooks, state management, and modern patterns.",
            thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
            channelTitle: "CodeAcademy",
            videoCount: 45,
            isMock: true
          },
          {
            id: "PL0Zuz27SZ-6PrE9srvEn8NBhOOyxPa1me",
            title: "Python for Data Science",
            description: "Learn Python from scratch with a focus on data analysis, visualization, and machine learning.",
            thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
            channelTitle: "DataWiz",
            videoCount: 32,
            isMock: true
          },
          {
            id: "PLTjRvDozrdlxjQ2Gph9f9UXas95Sa95Sa",
            title: "UI/UX Design Principles",
            description: "A complete guide to modern UI/UX design, from wireframing to high-fidelity prototyping.",
            thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?w=800&q=80",
            channelTitle: "DesignPro",
            videoCount: 28,
            isMock: true
          },
          {
            id: "PLu0W_9lII9agpFUAlPFe_VNSlXW5uE027",
            title: "Web Development Bootcamp",
            description: "The only course you need to learn web development - HTML, CSS, JS, Node, and more.",
            thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
            channelTitle: "WebDevSimplified",
            videoCount: 120,
            isMock: true
          }
        ];
        return res.json(mockData);
      }
      
      throw new Error(message);
    }

    const detailedPlaylists = (detailsData.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || "Untitled Playlist",
      description: item.snippet?.description || "",
      thumbnail: item.snippet?.thumbnails?.high?.url || 
                 item.snippet?.thumbnails?.medium?.url || 
                 item.snippet?.thumbnails?.default?.url || "",
      channelTitle: item.snippet?.channelTitle || "Unknown Channel",
      videoCount: item.contentDetails?.itemCount || 0,
    }));

    // Cache the results
    searchCache.set(queryStr, { data: detailedPlaylists, timestamp: Date.now() });

    console.log(`[YouTube Search] Returning ${detailedPlaylists.length} detailed playlists`);
    res.json(detailedPlaylists);
  } catch (error: any) {
    console.error("[YouTube Search] Catch Error:", error.message);
    res.status(500).json({ error: error.message || "Failed to search YouTube playlists" });
  }
});

/**
 * GET /api/youtube/playlist/:playlistId
 * Fetches all videos in a specific YouTube playlist using direct fetch.
 */
router.get("/playlist/:playlistId", async (req, res) => {
  const { playlistId } = req.params;
  const { key: apiKey, source } = getApiKey();

  // Check cache first
  const cached = playlistCache.get(playlistId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[YouTube Playlist] Returning cached results for: ${playlistId}`);
    return res.json(cached.data);
  }

  if (!apiKey) {
    return res.status(500).json({ 
      error: "YouTube API key not configured.",
      details: `Source: ${source}`
    });
  }

  try {
    console.log(`[YouTube Playlist] ID: ${playlistId} | Key Source: ${source}`);
    
    // 1. Get playlist metadata
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`;
    const playlistResponse = await fetch(playlistUrl, {
      headers: {
        'x-goog-api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    const playlistData = await playlistResponse.json();

    if (!playlistResponse.ok) {
      const reason = playlistData.error?.errors?.[0]?.reason || "unknown";
      const message = playlistData.error?.message || "Failed to fetch playlist metadata";
      
      console.error(`[YouTube Playlist Meta] API Error (${reason}):`, message);
      
      if (reason === 'quotaExceeded' || reason === 'keyInvalid' || reason === 'accessNotConfigured') {
        console.log(`[YouTube Playlist Meta] Falling back to mock data due to: ${reason}`);
        
        // Return mock playlist data
        const mockPlaylist = {
          id: playlistId,
          title: "Demo Course: Modern Web Development",
          description: "This is a demonstration course showing how SkillStudio structures YouTube content.",
          thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
          channelTitle: "SkillStudio Academy",
          videos: [
            { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Introduction to the Course", description: "Welcome to the course!", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 0 },
            { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Setting up your Environment", description: "Get ready to code.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 1 },
            { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Core Concepts", description: "Understanding the basics.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 2 },
            { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Advanced Techniques", description: "Taking it to the next level.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 3 },
            { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Final Project", description: "Build something amazing.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 4 }
          ]
        };
        
        playlistCache.set(playlistId, { data: mockPlaylist, timestamp: Date.now() });
        return res.json(mockPlaylist);
      }
      
      return res.status(playlistResponse.status).json({ 
        error: message,
        details: `Reason: ${reason}`,
        reason: reason
      });
    }

    const playlist = playlistData.items?.[0];
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    // 2. Fetch videos (handling pagination)
    let videos: any[] = [];
    let nextPageToken: string | undefined | null = undefined;
    const MAX_VIDEOS = 200;

    do {
      const itemsUrl: string = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const itemsResponse: Response = await fetch(itemsUrl, {
        headers: {
          'x-goog-api-key': apiKey,
          'Accept': 'application/json'
        }
      });
      const itemsData: any = await itemsResponse.json();

      if (!itemsResponse.ok) {
        const reason = itemsData.error?.errors?.[0]?.reason || "unknown";
        const message = itemsData.error?.message || "Failed to fetch playlist items";
        
        console.error(`[YouTube Playlist Items] API Error (${reason}):`, message);
        
        if (reason === 'quotaExceeded' || reason === 'keyInvalid' || reason === 'accessNotConfigured') {
          console.log(`[YouTube Playlist Items] Falling back to mock data due to: ${reason}`);
          
          // Return mock playlist data
          const mockPlaylist = {
            id: playlistId,
            title: "Demo Course: Modern Web Development",
            description: "This is a demonstration course showing how SkillStudio structures YouTube content.",
            thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
            channelTitle: "SkillStudio Academy",
            videos: [
              { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Introduction to the Course", description: "Welcome to the course!", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 0 },
              { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Setting up your Environment", description: "Get ready to code.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 1 },
              { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Core Concepts", description: "Understanding the basics.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 2 },
              { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Advanced Techniques", description: "Taking it to the next level.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 3 },
              { id: "dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Final Project", description: "Build something amazing.", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", orderIndex: 4 }
            ]
          };
          
          playlistCache.set(playlistId, { data: mockPlaylist, timestamp: Date.now() });
          return res.json(mockPlaylist);
        }
        
        return res.status(itemsResponse.status).json({ 
          error: message,
          details: `Reason: ${reason}`,
          reason: reason
        });
      }

      videos = [...videos, ...(itemsData.items || [])];
      nextPageToken = itemsData.nextPageToken;
    } while (nextPageToken && videos.length < MAX_VIDEOS);

    console.log(`[YouTube Playlist] Fetched ${videos.length} videos for "${playlist.snippet?.title}"`);

    const formattedVideos = videos.map((v, index) => ({
      id: v.contentDetails?.videoId,
      videoId: v.contentDetails?.videoId, // Keep for backward compatibility
      title: v.snippet?.title || "Untitled Video",
      description: v.snippet?.description || "",
      thumbnail: v.snippet?.thumbnails?.high?.url || 
                 v.snippet?.thumbnails?.medium?.url || 
                 v.snippet?.thumbnails?.default?.url || "",
      orderIndex: index,
    }));

    const result = {
      id: playlist.id,
      title: playlist.snippet?.title,
      description: playlist.snippet?.description,
      thumbnail: playlist.snippet?.thumbnails?.high?.url || playlist.snippet?.thumbnails?.medium?.url,
      channelTitle: playlist.snippet?.channelTitle,
      videos: formattedVideos,
    };

    // Cache the result
    playlistCache.set(playlistId, { data: result, timestamp: Date.now() });

    res.json(result);
  } catch (error: any) {
    console.error("[YouTube Playlist] Catch Error:", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch playlist details" });
  }
});

export default router;
