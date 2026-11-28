import { withPostJsonHandler } from '../_lib/http.ts';
import { handleNotesStart } from '../_lib/notesJobEngine.ts';

export default withPostJsonHandler((body, req) => handleNotesStart(body, req));
