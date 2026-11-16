/*
 * English message dictionary, the source of truth for the message keys.
 * ptBR.ts must define the same keys; index.ts picks the dictionary.
 */
/** English messages; `{name}` placeholders are filled by `t`. */
export const en = {
  // Configuration error screen
  "config.title": "Configuration error",
  "config.intro": "The admin panel is missing required settings. Define these environment variables (see admin/.env.example) and restart.",
  "config.missing": "Missing: {names}",
  "config.invalid": "Invalid (must be an http or https URL): {names}",

  // Unlock screen
  "unlock.title": "Admin password",
  "unlock.description": "Enter the admin password to continue.",
  "unlock.passwordLabel": "Password",
  "unlock.submit": "Unlock",
  "unlock.checking": "Checking...",
  "unlock.empty": "Enter the password.",
  "unlock.rejected": "The server rejected the password. Enter it again to continue.",

  // Editor panel
  "editor.newPost": "New post",
  "editor.editing": "Editing:",
  "editor.save": "Save",
  "editor.cancel": "Cancel",
  "editor.preview": "Preview",
  "editor.markdownHelp": "Markdown help",
  "editor.markdownLabel": "Post markdown",
  "editor.clear": "Clear",
  "editor.website": "Website",
  "editor.lock": "Lock",
  "editor.replaceTitle": "Replace content?",
  "editor.replaceText": "Doing this will replace all the current content of the text area.",
  "editor.continue": "Continue",
  "editor.clearingTitle": "Clearing form",
  "editor.clearingText": "Clearing form...",
  "editor.clearErrorTitle": "Error clearing the form",
  "editor.saveConfirmTitle": "Confirm save",
  "editor.saveConfirmCreate": "Do you want to create this post?",
  "editor.saveConfirmEdit": "Do you want to save the changes to this post?",
  "editor.ok": "Ok",
  "editor.savingTitle": "Saving",
  "editor.savingText": "Sending post, please wait...",
  "editor.successTitle": "Success",
  "editor.successMessage": "Post saved successfully.",
  "editor.errorTitle": "Error saving the post",
  "editor.failureStatus": "Failed to save (status {status}).",
  "editor.bannerRequired": "Select the card image before saving.",
  "editor.unexpectedError": "Unexpected error while saving.",
  "editor.validation.contentEmpty": "The markdown content field is not filled in",
  "editor.validation.titleEmpty": "The title field is not filled in",
  "editor.validation.bannerEmpty": "The card image field is not filled in",
  "editor.validation.previewEmpty": "The excerpt field is not filled in",
  "editor.validation.imageBadChars": "Image {name} contains invalid characters",
  "editor.validation.imageUnused": "Image {name} in the image container is not being used",
  "editor.validation.imageMissing": "Image {name} in the post text does not exist",
  "editor.validation.imageBusy": "Wait for the images to finish uploading",
  "editor.unnamedImage": "unnamed",
  "editor.markdownHelpTemplate": `# Basic tutorial on how to format text

_To start, click the **preview** button to see how the text looks with the formatting applied!_

**Bold text**\\
Use a backslash: \\ to force a line break

Leaving 1 empty line between two lines of text also breaks the line.

# Example of a big heading

## Example of a smaller heading

### Small heading

<div align="center">
To center text and images, use this.

It also works to center images
</div>

These 3 hyphens below create a "divider" in the text:

---

To use images:

![img](imageName)

Inside the parentheses, enter the image name exactly as it appears in the image container.

To make a list:

- Item one
- Item two
- Item three

To make a numbered list:

1. Item one
2. Item two
3. Item three

To learn more about markdown, click [here](https://www.markdownguide.org/basic-syntax/)`,

  // Form panel
  "form.loading": "...loading",
  "form.addImages": "Add images",
  "form.type": "Type",
  "form.title": "Title",
  "form.cardImage": "Card image",
  "form.excerpt": "Excerpt",
  "form.active": "Active",

  // Image list item
  "image.replace": "Replace image",
  "image.choose": "Choose image",
  "image.namePlaceholder": "Name",
  "image.confirmName": "Confirm name",
  "image.remove": "Remove image",

  // Post list and preview panel
  "post.delete": "delete",
  "post.edit": "edit",
  "post.active": "active",
  "post.inactive": "inactive",
  "preview.viewPosts": "View posts",
  "preview.loading": "loading...",
  "preview.placeholder": "Preview",
  "preview.loadPostsUnexpected": "Unexpected error while loading posts.",
  "preview.editConfirmTitle": "Confirm edit",
  "preview.editConfirmText": "Do you want to edit this post? Any unsaved changes in the current form will be discarded.",
  "preview.no": "No",
  "preview.yes": "Yes",
  "preview.preparingTitle": "Preparing edit",
  "preview.prepareUnexpected": "Unexpected error while preparing the edit.",
  "preview.deleteConfirmTitle": "Confirm deletion",
  "preview.deleteConfirmText": "Do you want to delete this post? This cannot be undone.",
  "preview.cancel": "Cancel",
  "preview.ok": "Ok",
  "preview.deletingTitle": "Deleting",
  "preview.deleteErrorTitle": "Error deleting the post",
  "preview.deleteSuccessTitle": "Success",
  "preview.deleteSuccessMessage": "Post deleted successfully.",
  "preview.deleteFailureStatus": "Failed to delete (status {status}).",
  "preview.deleteNoTarget": "Target post not found.",
  "preview.deleteUnexpected": "Unexpected error while deleting.",

  // API error codes (see errors.ts)
  "error.METHOD_NOT_ALLOWED": "Method not allowed.",
  "error.FORBIDDEN_ORIGIN": "This origin is not allowed by the server (check the allowed origins setting).",
  "error.SERVER_MISCONFIGURED": "The server is misconfigured.",
  "error.INTERNAL_ERROR": "Internal server error.",
  "error.INVALID_FORM_DATA": "Invalid form data.",
  "error.INVALID_JSON": "Invalid request body.",
  "error.INVALID_ID": "Invalid post id.",
  "error.MISSING_PASSWORD": "The admin password is missing.",
  "error.WRONG_PASSWORD": "Wrong password.",
  "error.POST_NOT_FOUND": "Post not found.",
  "error.INVALID_TITLE": "Invalid title.",
  "error.MISSING_IMAGES": "Some images used in the text were not sent.",
  "error.DUPLICATE_IMAGE_NAME": "Two images have the same name.",
  "error.TITLE_OR_SLUG_ALREADY_EXISTS": "A post with this title already exists.",
  "error.INVALID_EXTENSION": "Invalid image extension.",
  "error.INVALID_IMAGE_TYPE": "Image {file} has an invalid type. Accepted extensions: {acceptedExtensions}.",
  "error.IMAGE_TOO_LARGE": "Image {file} is too large (maximum {maxMb} MB).",
  "error.UUID_COLLISION": "Identifier collision, please try again.",
  "error.TRANSIENT_ERROR_RETRY_FAILED": "Temporary server error, please try again.",
  "error.INVALID_ACTION": "Invalid action.",
  "error.INVALID_PATH": "Invalid image path.",
  "error.INVALID_NAME": "Invalid image name.",
  "error.MISSING_FILE": "No file was sent.",
  "error.TEMP_IMAGE_NOT_FOUND": "Temporary image not found.",
  "error.TEMP_IMAGE_ALREADY_EXISTS": "A temporary image with this name already exists.",
  "error.POST_IMAGE_NOT_FOUND": "Post image not found.",
  "error.NETWORK_ERROR": "Could not reach the server. Check your connection and the functions URL.",
  "error.INVALID_RESPONSE": "Unexpected response from the server.",
  "error.UNKNOWN": "Unexpected error ({code}).",
  "error.generic": "Unexpected error."
} as const;

/** Every key a message can be requested with. */
export type MessageKey = keyof typeof en;
