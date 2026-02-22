import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

const GoogleAnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Initialize GA only once
        if (!window.GA_INITIALIZED) {
            const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
            if (measurementId) {
                ReactGA.initialize(measurementId);
                window.GA_INITIALIZED = true;
            }
        }
    }, []);

    useEffect(() => {
        if (window.GA_INITIALIZED) {
            ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
        }
    }, [location]);

    return null;
};

export default GoogleAnalyticsTracker;
