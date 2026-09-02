import { Box, CircularProgress, Typography } from "@mui/material";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

type ResourceStreetViewProps = {
  position: google.maps.LatLngLiteral;
  /** Google Place ID, if known — used to look up a more precise location
   * than the resource's own stored lat/lng before searching for imagery. */
  gpId: string | null;
};

type ViewState = "loading" | "available" | "unavailable";

/**
 * Renders a Street View panorama near `position`, preferring the precise
 * location of `gpId` (a Google Place) when available. Google's classic
 * Street View service has no direct "look up by place id" request, so a
 * Place lookup (for its `location`) is done first, then panorama presence
 * is checked via `StreetViewService.getPanorama`.
 */
const ResourceStreetView = ({ position, gpId }: ResourceStreetViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streetViewLibrary = useMapsLibrary("streetView");
  const placesLibrary = useMapsLibrary("places");
  const [state, setState] = useState<ViewState>("loading");

  const { lat, lng } = position;

  useEffect(() => {
    if (!streetViewLibrary || !containerRef.current) {
      return;
    }

    let cancelled = false;
    const container = containerRef.current;
    const fallbackLocation = { lat, lng };
    setState("loading");

    const renderPanoramaAt = (location: google.maps.LatLngLiteral) => {
      const streetViewService = new streetViewLibrary.StreetViewService();

      streetViewService.getPanorama(
        {
          location,
          radius: 50,
          source: google.maps.StreetViewSource.OUTDOOR,
        },
        (data, status) => {
          if (cancelled) {
            return;
          }

          if (status !== "OK" || !data?.location?.pano) {
            setState("unavailable");
            return;
          }

          new streetViewLibrary.StreetViewPanorama(container, {
            pano: data.location.pano,
            addressControl: false,
            fullscreenControl: false,
            motionTrackingControl: false,
          });
          setState("available");
        },
      );
    };

    const resolveLocation = async (): Promise<google.maps.LatLngLiteral> => {
      if (!gpId || !placesLibrary) {
        return fallbackLocation;
      }

      try {
        const place = new placesLibrary.Place({ id: gpId });
        await place.fetchFields({ fields: ["location"] });
        const location = place.location;
        return location
          ? { lat: location.lat(), lng: location.lng() }
          : fallbackLocation;
      } catch {
        return fallbackLocation;
      }
    };

    resolveLocation().then((location) => {
      if (!cancelled) {
        renderPanoramaAt(location);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [streetViewLibrary, placesLibrary, gpId, lat, lng]);

  if (state === "unavailable") {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No Street View available here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", height: "100%" }}>
      {state === "loading" && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </Box>
  );
};

export default ResourceStreetView;
