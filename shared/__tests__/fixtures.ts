/*
 * Sample PostCard and PostDetails objects shared by the shared-package tests.
 */
export const card = {
  id: "1",
  title: "T",
  slug: "t",
  preview: "p",
  post_type: "BLOG",
  active: true,
  banner_url: "https://x/b.png"
}

export const details = {
  id: "1",
  post_type: "BLOG",
  title: "T",
  preview: "p",
  active: false,
  slug: "t",
  banner_path: "1/banner.png",
  banner_url: "https://x/b.png",
  content_markdown: "# hi",
  image_paths: ["1/a.png"]
}
