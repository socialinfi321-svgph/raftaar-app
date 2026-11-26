import { handleDigest } from '../_lib/aiNotesEngine.ts';
import { withPostJsonHandler } from '../_lib/http.ts';

export default withPostJsonHandler((body) => handleDigest(body), {
  scope: 'ai-notes-digest',
  limit: 60,
  windowMs: 60_000,
});
