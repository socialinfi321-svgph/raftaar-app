import { withPostJsonHandler } from '../_lib/http.ts';
import { handleNotesWork } from '../_lib/notesJobEngine.ts';

export default withPostJsonHandler((body, req) => handleNotesWork(body, req));
