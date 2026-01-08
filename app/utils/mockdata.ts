// AKDELETE: This is mock data before commits
export const MOCK_RESOURCES = [
  {
    // --- METADATA (From your console log) ---
    id: 1,
    name: "Health Center #4",
    submittedBy: "phlask",
    submittedAt: "2024-06-22T17:39:10.895514",
    status: "PENDING",

    // --- THE "BEFORE" STATE (Your real data) ---
    currentData: {
      address: "4400 Haverford Avenue",
      city: "Philadelphia",
      description:
        "1st floor / Lab area ; 2nd floor / outside employee restroom",
      entry_type: "UNSURE",
      latitude: 39.96225,
      longitude: -75.21102,
      resource_type: "WATER",
      state: "PA",
      status: "OPERATIONAL",
      zip_code: "19104",
      hours: null, // Currently null
    },

    // --- THE "AFTER" STATE (Simulated suggestion) ---
    suggestedData: {
      address: "4400 Haverford Avenue", // Same
      description: "1st floor / Lab area ; 2nd floor / RESTROOM ACCESS UPDATED", // Changed
      status: "OPEN", // Changed from OPERATIONAL
      hours: "9am - 5pm", // Changed from null
    },
  },
];
