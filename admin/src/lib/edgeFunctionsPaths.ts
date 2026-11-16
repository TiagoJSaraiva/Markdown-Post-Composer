/*
 * URLs of the admin Edge Functions, built from the configured functions base URL.
 * Used by the services.
 */
import { getConfig } from "../config/env";

/** Names of the Edge Functions the admin calls directly. */
export type EdgeFunctionName =
  | "create_post"
  | "update_post"
  | "delete_post"
  | "temp_images";

/**
 * Builds the URL of an Edge Function. Resolved lazily so a missing configuration reaches
 * the config error screen instead of failing at module load.
 *
 * @param name - Function name.
 * @returns The absolute URL.
 */
export function functionUrl(name: EdgeFunctionName): string {
  return `${getConfig().functionsUrl}/${name}`;
}
