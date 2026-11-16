/*
 * Request contract of the delete_post Edge Function.
 */
/** DELETE body of delete_post. The admin password travels in the X-Admin-Password header, not in the body. */
export type DeletePostRequestBody = {
  /** Id of the post to delete. */
  id: string
}
