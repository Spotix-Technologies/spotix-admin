import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "./components/pwa/install-prompt";
import { RegisterServiceWorker } from "./components/pwa/register-sw";
import { SplashProvider } from "./components/pwa/splash-context";
import { SplashScreen } from "./components/pwa/splash-screen";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Spotix Admin Portal",
	description: "Admin dashboard for Spotix management",
	applicationName: "Spotix Admin",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Spotix Admin",
	},
	icons: {
		icon: [
			{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [
			{
				url: "/icons/apple-touch-icon.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
	},
};

export const viewport: Viewport = {
	themeColor: "#6b2fa5",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<SplashProvider>
					<SplashScreen />
					<RegisterServiceWorker />
					{children}
					<InstallPrompt />
				</SplashProvider>
			</body>
		</html>
	);
}
