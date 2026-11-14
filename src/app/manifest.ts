import type { MetadataRoute } from "next";

// Lets phones install Pace to the home screen and open it full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pace",
    short_name: "Pace",
    description: "Small daily wins, cheered on by your friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF6F2",
    theme_color: "#FAF6F2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
