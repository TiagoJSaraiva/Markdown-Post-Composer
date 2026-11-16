import { POST_IMAGES_BUCKET } from "../../../shared/constants/storage.ts"

function getRequiredEnv(name: string): string {
	const value = Deno.env.get(name)?.trim() 

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}

	return value
}

export const password: string = getRequiredEnv("REQUEST_PASSWORD")
export const bucket: string = POST_IMAGES_BUCKET 