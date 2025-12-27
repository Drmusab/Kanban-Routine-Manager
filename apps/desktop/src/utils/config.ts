// @ts-nocheck
// Configuration for API base URL
// - Production (Docker + nginx): Empty string for relative URLs, proxied by nginx to backend
// - Development: Full URL to backend server (http://localhost:3001)
// The REACT_APP_API_URL environment variable is set:
//   - At build time for production (empty string via Dockerfile build arg)
//   - At runtime for development (via docker-compose or local .env)
export const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3001';
