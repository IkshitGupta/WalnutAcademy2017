import type { NextConfig } from "next";
import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

/**
 * The addresses this machine answers on. The dev server serves its own
 * resources only to origins it knows, and a phone on the same network reaches
 * it by address rather than by localhost, so those addresses have to be named
 * for hot updates to arrive. They are read from the interfaces rather than
 * written down, because DHCP hands out a different one often enough. This is
 * read only by the dev server; an export is a directory of files and answers
 * no requests.
 */
const localAddresses = Object.values(networkInterfaces())
  .flat()
  .filter(
    (details): details is NetworkInterfaceInfo =>
      details !== undefined && details.family === "IPv4" && !details.internal,
  )
  .map((details) => details.address);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["@walnut/ui"],
  allowedDevOrigins: localAddresses,
  images: {
    // A static export has no image optimisation server. Images are pre-sized
    // and converted to WebP by scripts/optimise-images.mjs at build time.
    unoptimized: true,
  },
};

export default nextConfig;
