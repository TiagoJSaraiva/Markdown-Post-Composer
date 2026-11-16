export type PostImage = {
  file: File
  name: string
}

export type BasePostServiceParams = {
  category: string
  title: string
  preview: string
  content_markdown: string
  active: boolean
  banner: File | null
  images: PostImage[]
  // Sent as the X-Admin-Password header, never in the body.
  password: string
}

export type BuildPostFormDataParams = Omit<BasePostServiceParams, "password"> & {
  id?: string
}

export type UploadPostServiceParams = BasePostServiceParams

export type UpdatePostServiceParams = BasePostServiceParams & {
  id: string
}
