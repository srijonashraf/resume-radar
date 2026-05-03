// Vitest global setup
// VITE_* env vars must be set on process.env for the Vite import-analysis plugin
// to inject them into import.meta.env at transform time.
if (!process.env.VITE_API_URL) {
  process.env.VITE_API_URL = "http://localhost:3000/api/v1";
}
if (!process.env.VITE_GOOGLE_CLIENT_ID) {
  process.env.VITE_GOOGLE_CLIENT_ID = "test-client-id";
}
