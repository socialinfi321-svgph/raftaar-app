import { handleDigest } from '../_lib/aiNotesEngine.ts';
import { withPostJsonHandler } from '../_lib/http.ts';
import { verifyUserAndCatalogVideo } from '../_lib/supabaseServer.ts';

export default withPostJsonHandler(async (body, req) => {
  await verifyUserAndCatalogVideo(req, body.videoId);
  return handleDigest(body);
});
