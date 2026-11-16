import { createPostsClient, type PostsClient } from "@mdpc/shared/client";
import { getConfig } from "../config/env";

let instance: PostsClient | null = null;

// Created on first use (after the configuration gate) and shared afterwards.
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
