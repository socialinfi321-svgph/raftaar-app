import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function youtubeSearchPlugin() {
  return {
    name: 'youtube-search-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/youtube-search', async (req: any, res: any) => {
        try {
          const url = new URL(req.url, 'http://localhost:3000');
          const q = url.searchParams.get('q');
          if (!q || !q.trim()) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items: [] }));
            return;
          }

          const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}`;
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'hi,en-US,en;q=0.9'
            }
          });

          if (!response.ok) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items: [] }));
            return;
          }

          const html = await response.text();
          const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData = ({.*?});/s);
          if (!match) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items: [] }));
            return;
          }

          const data = JSON.parse(match[1]);

          function findVideos(obj: any, results: any[] = []): any[] {
            if (!obj || typeof obj !== 'object') return results;
            if (obj.videoRenderer && obj.videoRenderer.videoId) {
              results.push(obj.videoRenderer);
            }
            for (const key of Object.keys(obj)) {
              if (key !== 'reelShelfRenderer' && key !== 'shortsLockupViewModel') {
                findVideos(obj[key], results);
              }
            }
            return results;
          }

          const rawVideos = findVideos(data);
          const seenIds = new Set<string>();
          const items: any[] = [];

          for (const v of rawVideos) {
            const vidId = v.videoId;
            if (!vidId || seenIds.has(vidId)) continue;
            seenIds.add(vidId);

            const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || '';
            const duration = v.lengthText?.simpleText || '';
            const desc = v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || '';
            const channelTitle = v.ownerText?.runs?.[0]?.text || '';
            const channelId = v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
            const channelAvatar = v.channelThumbnailSupportedRendered?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channelTitle || 'Educator')}`;
            
            const viewStr = v.viewCountText?.simpleText || '';
            let viewCount: number | undefined;
            if (viewStr) {
              const numMatch = viewStr.replace(/,/g, '').match(/\d+/);
              if (numMatch) viewCount = parseInt(numMatch[0], 10);
            }

            // Exclude shorts: title contains #shorts or duration <= 65s
            const lowerTitle = title.toLowerCase();
            let isShort = lowerTitle.includes('#shorts') || lowerTitle.includes('#short') || lowerTitle.includes('/shorts/');
            if (!isShort && duration) {
              const parts = duration.split(':').map(Number);
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                if (parts[0] * 60 + parts[1] <= 65) isShort = true;
              } else if (parts.length === 1 && !isNaN(parts[0])) {
                if (parts[0] <= 65) isShort = true;
              }
            }

            if (!isShort) {
              items.push({
                id: vidId,
                title,
                description: desc,
                thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                channelId,
                channelTitle: channelTitle || 'Educator',
                channelAvatar,
                publishedAt: new Date().toISOString(),
                viewCount,
                duration
              });
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ items: items.slice(0, 30) }));
        } catch (err: any) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ items: [] }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), youtubeSearchPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});