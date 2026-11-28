import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import digestHandler from './api/ai-notes/digest.ts';
import outlineHandler from './api/ai-notes/outline.ts';
import chapterHandler from './api/ai-notes/chapter.ts';
import visualHandler from './api/ai-notes/visual.ts';
import healthHandler from './api/ai-notes/health.ts';
import notesStartHandler from './api/notes/start.ts';
import notesWorkHandler from './api/notes/work.ts';
import notesStatusHandler from './api/notes/status.ts';
import { sendJson } from './api/_lib/http.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  /* ---------------- Server-Side Resumable Lecture Jobs & AI Routes ---------------- */
  app.all('/api/notes/start', (req, res) => {
    void notesStartHandler(req, res);
  });
  app.all('/api/notes/work', (req, res) => {
    void notesWorkHandler(req, res);
  });
  app.all('/api/notes/status', (req, res) => {
    void notesStatusHandler(req, res);
  });
  app.all('/api/ai-notes/health', (req, res) => {
    healthHandler(req, res);
  });
  app.all('/api/ai-notes/digest', (req, res) => {
    void digestHandler(req, res);
  });
  app.all('/api/ai-notes/outline', (req, res) => {
    void outlineHandler(req, res);
  });
  app.all('/api/ai-notes/chapter', (req, res) => {
    void chapterHandler(req, res);
  });
  app.all('/api/ai-notes/visual', (req, res) => {
    void visualHandler(req, res);
  });

  /* ---------------- Existing YouTube Search Proxy ---------------- */
  app.get('/api/youtube-search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 200) : '';
      if (!q) {
        res.json({ items: [] });
        return;
      }

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'hi,en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        res.json({ items: [] });
        return;
      }

      const html = await response.text();
      const match =
        html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        html.match(/ytInitialData = ({.*?});/s);
      if (!match) {
        res.json({ items: [] });
        return;
      }

      const data = JSON.parse(match[1]);

      const findVideos = (obj: any, results: any[] = []): any[] => {
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
      };

      const rawVideos = findVideos(data);
      const seenIds = new Set<string>();
      const items: any[] = [];

      for (const v of rawVideos) {
        const vidId = v.videoId;
        if (!vidId || seenIds.has(vidId)) continue;
        seenIds.add(vidId);

        const title =
          v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || '';
        const duration = v.lengthText?.simpleText || '';
        const desc =
          v.detailedMetadataSnippets?.[0]?.snippetText?.runs
            ?.map((r: any) => r.text)
            .join('') || '';
        const channelTitle = v.ownerText?.runs?.[0]?.text || '';
        const channelId =
          v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
        const channelAvatar =
          v.channelThumbnailSupportedRendered?.channelThumbnailWithLinkRenderer?.thumbnail
            ?.thumbnails?.[0]?.url ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
            channelTitle || 'Educator'
          )}`;

        const viewStr = v.viewCountText?.simpleText || '';
        let viewCount: number | undefined;
        if (viewStr) {
          const numMatch = viewStr.replace(/,/g, '').match(/\d+/);
          if (numMatch) viewCount = parseInt(numMatch[0], 10);
        }

        const lowerTitle = title.toLowerCase();
        let isShort =
          lowerTitle.includes('#shorts') ||
          lowerTitle.includes('#short') ||
          lowerTitle.includes('/shorts/');
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
            duration,
          });
        }
      }

      res.json({ items: items.slice(0, 30) });
    } catch {
      res.json({ items: [] });
    }
  });

  /* Ensure missing /api/* endpoints return JSON 404 before Vite/SPA fallback */
  app.use('/api', (_req, res) => {
    sendJson(res, 404, { error: 'API endpoint not found.' });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Raftaar server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
