// app/components/pwa/install-prompt.tsx
"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "spotix-admin-install-dismissed";

function isStandalone() {
	if (typeof window === "undefined") return false;
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		// iOS Safari
		(window.navigator as unknown as { standalone?: boolean }).standalone ===
			true
	);
}

function isIOS() {
	if (typeof window === "undefined") return false;
	return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [showIOSHint, setShowIOSHint] = useState(false);
	const [dismissed, setDismissed] = useState(true);

	useEffect(() => {
		if (isStandalone()) return;
		if (localStorage.getItem(DISMISSED_KEY) === "1") return;

		setDismissed(false);

		const handleBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			setDeferredPrompt(event as BeforeInstallPromptEvent);
		};
		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

		// iOS never fires beforeinstallprompt - show manual instructions instead
		if (isIOS()) {
			setShowIOSHint(true);
		}

		const handleInstalled = () => {
			setDeferredPrompt(null);
			setShowIOSHint(false);
			setDismissed(true);
		};
		window.addEventListener("appinstalled", handleInstalled);

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			);
			window.removeEventListener("appinstalled", handleInstalled);
		};
	}, []);

	const dismiss = () => {
		localStorage.setItem(DISMISSED_KEY, "1");
		setDismissed(true);
	};

	const handleInstall = async () => {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === "accepted" || outcome === "dismissed") {
			setDeferredPrompt(null);
			dismiss();
		}
	};

	if (dismissed || (!deferredPrompt && !showIOSHint)) return null;

	return (
		<div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#6b2fa5]/20 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4">
			<img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0" />

			<div className="flex-1 text-sm">
				<p className="font-semibold text-gray-900">Install Spotix Admin</p>
				{showIOSHint && !deferredPrompt ? (
					<p className="mt-0.5 text-gray-600">
						Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> then{" "}
						&quot;Add to Home Screen&quot;
						<SquarePlus className="inline h-3.5 w-3.5 align-text-bottom" /> to
						install.
					</p>
				) : (
					<p className="mt-0.5 text-gray-600">
						Add it to your device for quicker access.
					</p>
				)}
			</div>

			{deferredPrompt ? (
				<Button size="sm" onClick={handleInstall} className="shrink-0 gap-1.5">
					<Download className="h-4 w-4" />
					Install
				</Button>
			) : null}

			<button
				type="button"
				onClick={dismiss}
				aria-label="Dismiss"
				className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
