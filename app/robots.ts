import type { MetadataRoute } from "next";

// The app is private. Only the public pages may be indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/login", "/signup", "/privacy"], disallow: ["/"] },
  };
}
