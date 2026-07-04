import { buildContextMarkdown } from "@/lib/aiContext";

// The whole knowledge base as one markdown file, for AI assistants to read.
// Static — generated once at build time.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildContextMarkdown(), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
