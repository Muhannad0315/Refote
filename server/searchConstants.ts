// Server-side resolution of the shared search radius. The canonical default
// lives in `shared/searchConstants.ts` so the client bundle can import it.
import {
  DEFAULT_SEARCH_RADIUS_METERS,
  SHARED_SEARCH_RADIUS_NAME,
} from "../shared/searchConstants";

export const SEARCH_RADIUS_METERS: number =
  Number(process.env.SEARCH_RADIUS_METERS ?? DEFAULT_SEARCH_RADIUS_METERS) ||
  DEFAULT_SEARCH_RADIUS_METERS;
export const SEARCH_RADIUS_SOURCE = process.env.SEARCH_RADIUS_METERS
  ? "env:SEARCH_RADIUS_METERS"
  : SHARED_SEARCH_RADIUS_NAME;
