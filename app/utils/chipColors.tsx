import { LocalDining, Park, WaterDrop, Wc } from "@mui/icons-material";
import type { ChipProps } from "@mui/material";
import type { ReactElement } from "react";
import type { ResourceType } from "~/types/ResourceEntry";
import type { ResourceEditReviewStatus } from "~/types/ResourceRevision";

export const resourceTypeChipColor = (
  type: ResourceType | string,
): ChipProps["color"] => {
  switch (type) {
    case "WATER":
      return "primary";
    case "FOOD":
      return "warning";
    case "FORAGE":
      return "success";
    case "BATHROOM":
      return "secondary";
    default:
      return "default";
  }
};

export const resourceTypeChipIcon = (
  type: ResourceType | string,
): ReactElement | undefined => {
  switch (type) {
    case "WATER":
      return (
        <WaterDrop
          sx={{
            ".MuiChip-root:hover &": {
              animation: "chip-icon-bob 1.8s ease-in-out infinite",
            },
          }}
        />
      );
    case "FOOD":
      return (
        <LocalDining
          sx={{
            ".MuiChip-root:hover &": {
              animation: "chip-icon-pulse 1.6s ease-in-out infinite",
            },
          }}
        />
      );
    case "FORAGE":
      return (
        <Park
          sx={{
            transformOrigin: "bottom center",
            ".MuiChip-root:hover &": {
              animation: "chip-icon-sway 2.2s ease-in-out infinite",
            },
          }}
        />
      );
    case "BATHROOM":
      return (
        <Wc
          sx={{
            ".MuiChip-root:hover &": {
              animation: "chip-icon-wiggle 2s ease-in-out infinite",
            },
          }}
        />
      );
    default:
      return undefined;
  }
};

export const statusChipColor = (
  status: ResourceEditReviewStatus | string,
): ChipProps["color"] => {
  switch (status) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    default:
      return "default";
  }
};
