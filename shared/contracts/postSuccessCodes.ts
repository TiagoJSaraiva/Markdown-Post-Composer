/*
 * Success message codes returned by create_post, update_post and delete_post.
 */
/** Values of `message` in the success body of create_post, update_post and delete_post. */
export const POST_SUCCESS_CODES = {
  POST_CREATED: "POST_CREATED",
  POST_UPDATED: "POST_UPDATED",
  POST_DELETED: "POST_DELETED",
} as const

/** Union of the values of POST_SUCCESS_CODES. */
export type PostSuccessCode = (typeof POST_SUCCESS_CODES)[keyof typeof POST_SUCCESS_CODES]
