import { handleVisual } from '../_lib/aiNotesEngine.ts';
import { withPostJsonHandler } from '../_lib/http.ts';

export default withPostJsonHandler((body) => handleVisual(body), {
  scope: 'ai-notes-visual',
  limit: 60,
  windowMs: 60_000,
});
