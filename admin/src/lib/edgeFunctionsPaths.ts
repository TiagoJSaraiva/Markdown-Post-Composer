import { getConfig } from "../config/env";

export type EdgeFunctionName =
  | "create_post"
  | "update_post"
  | "delete_post"
  | "temp_images";

// Resolved lazily so a missing configuration reaches the config error screen
// instead of failing at module load.
export function functionUrl(name: EdgeFunctionName): string {
  return `${getConfig().functionsUrl}/${name}`;
}
