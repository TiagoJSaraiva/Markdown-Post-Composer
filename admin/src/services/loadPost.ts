import { getPostsClient } from '../lib/postsClient'

// The result only carries the URLs of the banner and images, not the files:
// fetch the URL to get the image itself.
export default function loadPostService(id: string) {
  return getPostsClient().getPost(id)
}
