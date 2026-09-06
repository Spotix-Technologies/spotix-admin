// app/components/pwa/splash-context.tsx
"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

interface SplashContextValue {
	/** Keep the splash on screen under `key` until `hideSplash(key)` is called. */
	showSplash: (key: string, message?: string) => void;
	/** Release `key`'s hold on the splash. Safe to call even if it was never shown. */
	hideSplash: (key: string) => void;
}

const SplashContext = createContext<SplashContextValue | null>(null);

interface VisibleState {
	// visible while the very first page load hasn't finished yet
	initialLoad: boolean;
	// key -> optional status message, for pages/flows requesting the splash
	requests: Map<string, string | undefined>;
}

export function SplashProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<VisibleState>({
		initialLoad: true,
		requests: new Map(),
	});

	// Auto-dismiss the initial load splash once the window has fully loaded,
	// with a timeout fallback so it can never get stuck on screen.
	useEffect(() => {
		let fallbackTimer: ReturnType<typeof setTimeout>;

		const finishInitialLoad = () => {
			setState((prev) => (prev.initialLoad ? { ...prev, initialLoad: false } : prev));
		};

		if (document.readyState === "complete") {
			finishInitialLoad();
		} else {
			window.addEventListener("load", finishInitialLoad);
			fallbackTimer = setTimeout(finishInitialLoad, 6000);
		}

		return () => {
			window.removeEventListener("load", finishInitialLoad);
			clearTimeout(fallbackTimer);
		};
	}, []);

	const showSplash = useCallback((key: string, message?: string) => {
		setState((prev) => {
			const requests = new Map(prev.requests);
			requests.set(key, message);
			return { ...prev, requests };
		});
	}, []);

	const hideSplash = useCallback((key: string) => {
		setState((prev) => {
			if (!prev.requests.has(key)) return prev;
			const requests = new Map(prev.requests);
			requests.delete(key);
			return { ...prev, requests };
		});
	}, []);

	const visible = state.initialLoad || state.requests.size > 0;
	// Most recently requested message wins (Map preserves insertion order).
	const message = [...state.requests.values()].reverse().find(Boolean);

	const value = useMemo(() => ({ showSplash, hideSplash }), [showSplash, hideSplash]);

	return (
		<SplashContext.Provider value={value}>
			<SplashVisibilityContext.Provider value={{ visible, message }}>
				{children}
			</SplashVisibilityContext.Provider>
		</SplashContext.Provider>
	);
}

// Kept separate from SplashContext so components that only need show/hide
// (i.e. every page except <SplashScreen /> itself) don't re-render on every
// visibility change.
const SplashVisibilityContext = createContext<{
	visible: boolean;
	message?: string;
}>({ visible: false, message: undefined });

export function useSplash() {
	const ctx = useContext(SplashContext);
	if (!ctx) throw new Error("useSplash must be used within a SplashProvider");
	return ctx;
}

export function useSplashVisibility() {
	return useContext(SplashVisibilityContext);
}
