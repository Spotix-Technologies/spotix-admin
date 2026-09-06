import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Spotix Admin",
		short_name: "Spotix Admin",
		description: "Admin dashboard for Spotix management",
		start_url: "/",
		scope: "/",
		display: "standalone",
		orientation: "portrait-primary",
		background_color: "#6b2fa5",
		theme_color: "#6b2fa5",
		icons: [
			{
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
		],
	};
}
