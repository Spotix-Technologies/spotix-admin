// app/components/pwa/splash-screen.tsx
"use client";

import { useEffect, useState } from "react";
import { useSplashVisibility } from "./splash-context";

/**
 * Full-screen brand splash. Visible on the very first page load until the
 * window finishes loading, and again whenever a page calls `showSplash()`
 * (e.g. while its own data is still loading, or right after sign-in) via
 * `useSplash()` from ./splash-context.
 */
export function SplashScreen() {
	const { visible, message } = useSplashVisibility();
	const [rendered, setRendered] = useState(true);
	const [fadingOut, setFadingOut] = useState(false);

	useEffect(() => {
		if (visible) {
			setRendered(true);
			setFadingOut(false);
			return;
		}

		setFadingOut(true);
		// matches the CSS transition duration below
		const timer = setTimeout(() => setRendered(false), 300);
		return () => clearTimeout(timer);
	}, [visible]);

	if (!rendered) return null;

	return (
		<output
			aria-label="Loading Spotix Admin Tool"
			className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center transition-opacity duration-300 ${
				fadingOut ? "opacity-0" : "opacity-100"
			}`}
			style={{ backgroundColor: "#6b2fa5" }}
		>
			<div className="flex flex-1 flex-col items-center justify-center gap-6">
				<img
					src="/icons/logo-cropped.png"
					alt="Spotix"
					className="h-12 w-auto sm:h-14"
				/>
				<div className="flex flex-col items-center gap-3">
					<p className="max-w-xs text-xl font-semibold text-white sm:text-2xl">
						Welcome to Spotix Admin Tool
					</p>
					{message ? (
						<p className="text-sm text-white/80 sm:text-base">{message}</p>
					) : null}
				</div>
			</div>
			<p className="pb-8 text-sm text-white/70">
				Developed &amp; Maintained by Spotix Technologies
			</p>
		</output>
	);
}
