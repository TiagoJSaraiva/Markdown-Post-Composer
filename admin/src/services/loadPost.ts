/*
 * Loads one post through the shared posts client. Used by the edit flow (useEditPost).
 */
import { getPostsClient } from '../lib/postsClient'

/**
 * Loads a post, inactive ones included. The result only carries the URLs of the banner and
 * images, not the files: fetch the URL to get the image itself.
 *
 * @param id - Post id.
 * @param password - Admin password.
 * @returns The posts client result (never throws).
 */
export default function loadPostService(id: string, password: string) {
  return getPostsClient().getPost(id, { adminPassword: password })
}
