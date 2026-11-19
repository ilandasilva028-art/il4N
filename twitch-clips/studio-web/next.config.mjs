/** API FastAPI derrière le même domaine : /api/* est relayé vers API_URL (défaut : moteur local). */
const API_URL = process.env.API_URL || "http://127.0.0.1:8000";
export default {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  poweredByHeader: false,
  compress: false,          // sinon le flux temps réel (SSE) relayé est mis en tampon par la compression
  // imports de vidéos locales (plusieurs centaines de Mo) relayés vers FastAPI
  experimental: { middlewareClientMaxBodySize: "4gb" },
};
