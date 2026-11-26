import { handleChapter } from '../_lib/aiNotesEngine.ts';
import { withPostJsonHandler } from '../_lib/http.ts';

export default withPostJsonHandler((body) => handleChapter(body), {
  scope: 'ai-notes-chapter',
  limit: 60,
  windowMs: 60_000,
});
