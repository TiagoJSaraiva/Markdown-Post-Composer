/*
 * Lists the post cards for the admin dropdown through the shared posts client.
 */
import { getPostsClient } from '../lib/postsClient'

/**
 * Lists all post cards, including inactive ones.
 *
 * @param password - Admin password.
 * @returns The posts client result (never throws).
 */
export default function loadCardsService(password: string) {
  return getPostsClient().listPosts({ includeInactive: true, adminPassword: password })
}
