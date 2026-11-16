/*
 * Shared instance of the read-only posts SDK (@mdpc/shared), configured from the
 * admin environment. Used by the list/load services and the markdown preview.
 */
import { createPostsClient, type PostsClient } from "@mdpc/shared/client";
import { getConfig } from "../config/env";

let instance: PostsClient | null = null;

/**
 * Returns the shared PostsClient. Created on first use (after the configuration gate) and
 * reused afterwards.
 *
 * @returns The client.
 * @throws Error when the configuration is invalid.
 */
export function getPostsClient(): PostsClient {
  if (!instance) {
    const config = getConfig();

    instance = createPostsClient({
      functionsUrl: config.functionsUrl,
      storagePublicUrl: config.storagePublicUrl,
      postsBucket: config.postsBucket
    });
  }

  return instance;
}
