import { handleOutline } from '../_lib/aiNotesEngine.ts';
import { withPostJsonHandler } from '../_lib/http.ts';

export default withPostJsonHandler((body) => handleOutline(body), {
  scope: 'ai-notes-outline',
  limit: 40,
  windowMs: 60_000,
});
