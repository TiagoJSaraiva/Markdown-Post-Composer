import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import { isAbsoluteOrSpecialUrl } from "../client/storageUrls.ts"

export type MarkdownRendererProps = {
  markdown: string
  className?: string
  /** Maps relative asset URLs (src) to final URLs. Takes precedence over `client`. */
  resolveAssetUrl?: (url: string) => string
  /** A posts client; its resolveMarkdownAssetUrl is used when resolveAssetUrl is not given. */
  client?: { resolveMarkdownAssetUrl(url: string): string }
  /** Overrides merged over the default components. */
  components?: Components
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "div"],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    div: [["align", "center"]]
  }
}

const defaultComponents: Components = {
  // `node` is the hast element react-markdown passes along; it is not a DOM attribute.
  img: ({ node: _node, ...props }) => <img loading="lazy" decoding="async" {...props} />
}

export default function MarkdownRenderer({
  markdown,
  className,
  resolveAssetUrl,
  client,
  components
}: MarkdownRendererProps) {
  const resolve = resolveAssetUrl ?? (client ? (url: string) => client.resolveMarkdownAssetUrl(url) : undefined)

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeRaw], [rehypeSanitize, sanitizeSchema]]}
        urlTransform={(url, key) => {
          if (key !== "src" || !resolve || !url || isAbsoluteOrSpecialUrl(url)) {
            return url
          }
          return resolve(url)
        }}
        components={{ ...defaultComponents, ...components }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

export { MarkdownRenderer }
