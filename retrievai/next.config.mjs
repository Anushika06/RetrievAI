/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase the server action body size limit for file uploads (10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // pdf-parse uses dynamic requires for its test files which causes
  // webpack to warn/fail. We mark it as external so Next.js doesn't
  // try to bundle it — it's loaded from node_modules at runtime.
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep pdf-parse as a server-only external (it works fine with dynamic import)
      config.externals = [...(config.externals || []), "pdf-parse"];
    }
    return config;
  },
};

export default nextConfig;
