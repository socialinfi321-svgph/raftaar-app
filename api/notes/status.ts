import { withPostJsonHandler } from '../_lib/http.ts';
import { handleNotesStatus } from '../_lib/notesJobEngine.ts';

export default withPostJsonHandler((body, req) => handleNotesStatus(body, req));
