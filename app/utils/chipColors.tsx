import LocalDining from "@mui/icons-material/LocalDining";
import Park from "@mui/icons-material/Park";
import WaterDrop from "@mui/icons-material/WaterDrop";
import Wc from "@mui/icons-material/Wc";
import type { ChipProps } from "@mui/material";
import type { ReactElement } from "react";
import type { EditReviewStatus } from "~/types/ResourceEdit";
import type { ResourceType } from "~/types/ResourceEntry";

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
  status: EditReviewStatus | string,
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
