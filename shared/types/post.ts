/*
 * Parameter types of the post services (create/update) shared with the admin.
 */
/** A content image to upload. */
export type PostImage = {
  file: File
  /** File name sent to the function; the markdown refers to its part before the last dot. */
  name: string
}

/** Parameters common to the create and update services. */
export type BasePostServiceParams = {
  category: string
  title: string
  preview: string
  content_markdown: string
  active: boolean
  /** `null` keeps the current banner on update. */
  banner: File | null
  images: PostImage[]
  /** Sent as the X-Admin-Password header, never in the body. */
  password: string
}

/** Parameters of buildPostFormData: the service params without the password, plus an optional id. */
export type BuildPostFormDataParams = Omit<BasePostServiceParams, "password"> & {
  id?: string
}

/** Parameters of the create service. */
export type UploadPostServiceParams = BasePostServiceParams

/** Parameters of the update service. */
export type UpdatePostServiceParams = BasePostServiceParams & {
  id: string
}
