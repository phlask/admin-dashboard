import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  Pin,
} from "@vis.gl/react-google-maps";
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
  /** Google Place ID, if known — improves Street View accuracy. */
  gpId?: string | null;
  label?: string;
};

const PANEL_HEIGHT = 280;

/**
 * Map + Street View preview for a proposed (or current) resource location,
 * used on the review detail page so a reviewer can visually confirm a
 * submission without leaving the dashboard.
 */
const ResourceLocationPanel = ({
  latitude,
  longitude,
  gpId,
  label,
}: ResourceLocationPanelProps) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Alert severity="info">
        Map preview is unavailable — no Google Maps API key is configured
        (set <code>VITE_GOOGLE_MAPS_API_KEY</code>).
      </Alert>
    );
  }

  const position = { lat: latitude as number, lng: longitude as number };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Location
      </Typography>
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
