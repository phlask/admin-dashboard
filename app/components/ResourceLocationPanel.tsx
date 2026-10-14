import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  Pin,
} from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import { calculateDistance } from "~/utils/distance";
import ResourceStreetView from "./ResourceStreetView";

// Inlined by Vite at build time (VITE_-prefixed vars are exposed to the
// client bundle) — this key is meant to be public/client-visible, reused
// from the phlask-map repo and restricted by HTTP referrer in GCP Console.
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
  | string
  | undefined;

type ResourceLocationPanelProps = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  /** The live resource's location, when reviewing an edit to an existing
   * resource — shown as a second pin if the edit moves it. */
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  /** Google Place ID, if known — improves Street View accuracy. */
  gpId?: string | null;
  label?: string;
};

const PANEL_HEIGHT = 280;

/** Below this, a "move" is just float noise and not worth a second pin. */
const MOVED_THRESHOLD_METERS = 1;

/** Lat/lng are bound to editable inputs; wait for typing to settle so every
 * keystroke doesn't re-center the map and fire a billed Street View lookup. */
const POSITION_DEBOUNCE_MS = 600;

const isValidPosition = (
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
};

const formatDistance = (meters: number) =>
  meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;

/**
 * Map + Street View preview for a proposed (or current) resource location,
 * used on the review detail page so a reviewer can visually confirm a
 * submission without leaving the dashboard.
 */
const ResourceLocationPanel = ({
  latitude: liveLatitude,
  longitude: liveLongitude,
  currentLatitude,
  currentLongitude,
  gpId,
  label,
}: ResourceLocationPanelProps) => {
  const latitude = useDebouncedValue(liveLatitude, POSITION_DEBOUNCE_MS);
  const longitude = useDebouncedValue(liveLongitude, POSITION_DEBOUNCE_MS);

  if (!isValidPosition(latitude, longitude)) {
    return null;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Alert severity="info">
        Map preview is unavailable — no Google Maps API key is configured (set{" "}
        <code>VITE_GOOGLE_MAPS_API_KEY</code>).
      </Alert>
    );
  }

  const position = { lat: latitude, lng: longitude as number };

  const currentPosition = isValidPosition(currentLatitude, currentLongitude)
    ? { lat: currentLatitude, lng: currentLongitude as number }
    : null;
  const movedMeters = currentPosition
    ? calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        position.lat,
        position.lng,
      )
    : 0;
  const showCurrentPin = movedMeters > MOVED_THRESHOLD_METERS;

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Location
      </Typography>
      {showCurrentPin && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This edit moves the resource {formatDistance(movedMeters)} from its
          current location (grey pin) to the proposed one (red pin).
        </Alert>
      )}
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        libraries={["places", "streetView"]}
      >
        <Stack direction={{ xs: "column", md: "row" }} gap={2}>
          <Box
            sx={{
              flex: 1,
              height: PANEL_HEIGHT,
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <GoogleMap
              defaultCenter={position}
              center={position}
              defaultZoom={17}
              disableDefaultUI
              gestureHandling="cooperative"
              mapId="phlask-admin-review-map"
              style={{ width: "100%", height: "100%" }}
            >
              {showCurrentPin && currentPosition && (
                <AdvancedMarker
                  position={currentPosition}
                  title="Current location"
                >
                  <Pin
                    background="#9e9e9e"
                    borderColor="#616161"
                    glyphColor="#ffffff"
                  />
                </AdvancedMarker>
              )}
              <AdvancedMarker position={position} title={label}>
                <Pin />
              </AdvancedMarker>
            </GoogleMap>
          </Box>
          <Box
            sx={{
              flex: 1,
              height: PANEL_HEIGHT,
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <ResourceStreetView position={position} gpId={gpId ?? null} />
          </Box>
        </Stack>
      </APIProvider>
    </Paper>
  );
};

export default ResourceLocationPanel;
