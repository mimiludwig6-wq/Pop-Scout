/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Spotify serves every artist image off this host.
    remotePatterns: [{ protocol: "https", hostname: "i.scdn.co" }],
  },
};

export default nextConfig;
