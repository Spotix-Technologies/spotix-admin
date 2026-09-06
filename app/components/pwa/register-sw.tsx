// app/components/pwa/register-sw.tsx
"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;

		const register = () => {
			navigator.serviceWorker
				.register("/sw.js")
				.catch((error) =>
					console.error("Service worker registration failed:", error),
				);
		};

		// Register after load so it never competes with the initial page load
		if (document.readyState === "complete") {
			register();
		} else {
			window.addEventListener("load", register);
			return () => window.removeEventListener("load", register);
		}
	}, []);

	return null;
}
