// The admin password travels in the X-Admin-Password header, not in the body.
export type DeletePostRequestBody = {
  id: string
}
