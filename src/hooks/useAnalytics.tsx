import { useEffect } from "react";
// import mixpanel from "mixpanel-browser";
import useAppState from "./useAppState";

function useAnalytics() {
  const isDevelopment = process.env.APP_ENV === "development";
  const { userId } = useAppState();

  // Temporarily disable Mixpanel to prevent SSR issues
  useEffect(() => {
    // Only log in development
    if (isDevelopment) {
      console.log("Analytics disabled for now to prevent SSR issues");
    }
  }, [isDevelopment]);

  function trackEvent(eventName: string, tags: Record<string, string> = {}) {
    // Only log in development
    if (isDevelopment) {
      console.log("Analytics disabled - would track:", eventName, tags);
    }
  }

  return { trackEvent };
}

export default useAnalytics;
