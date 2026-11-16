/*
 * Public entry point of the read SDK (@mdpc/shared/client): posts client,
 * storage URL helpers and the post types.
 */
export { createPostsClient, DEFAULT_POSTS_BUCKET } from "./postsClient.ts"
export type {
  FetchLike,
  GetPostBySlugOptions,
  GetPostOptions,
  ListPostsOptions,
  PostsClient,
  PostsClientOptions,
  PostsClientResult
} from "./postsClient.ts"
export {
  buildStoragePublicUrl,
  encodePathSegments,
  isAbsoluteOrSpecialUrl,
  normalizeStoragePath,
  resolveMarkdownAssetUrl
} from "./storageUrls.ts"
export type { StorageUrlOptions } from "./storageUrls.ts"
export type { PostCard } from "../contracts/loadCards.ts"
export type { PostDetails } from "../contracts/loadPost.ts"
