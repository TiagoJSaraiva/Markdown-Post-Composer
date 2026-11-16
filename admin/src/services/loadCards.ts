import { getPostsClient } from '../lib/postsClient'

export default function loadCardsService(password: string) {
  return getPostsClient().listPosts({ includeInactive: true, adminPassword: password })
}
