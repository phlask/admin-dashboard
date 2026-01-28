/**
 * PHLask Resource Entry Types
 *
 * These types define the schema for PHLask resources stored in the Supabase database.
 * Based on the schema from the phlask-map project.
 */

/**
 * Type of data source for a resource entry.
 */
export type DataSourceType = 'MANUAL' | 'WEB_SCRAPE';

/**
 * Type of resource available in the system.
 */
export type ResourceType = 'WATER' | 'FOOD' | 'FORAGE' | 'BATHROOM';

/**
 * Status of a resource.
 */
export type ResourceStatus =
  | 'OPERATIONAL'
  | 'TEMPORARILY_CLOSED'
  | 'PERMANENTLY_CLOSED'
  | 'HIDDEN';

/**
 * Entry permission type for a resource.
 */
export type EntryType = 'OPEN' | 'RESTRICTED' | 'UNSURE';

/**
 * Type of water dispenser.
 */
export type DispenserType =
  | 'DRINKING_FOUNTAIN'
  | 'BOTTLE_FILLER'
  | 'SINK'
  | 'JUG'
  | 'SODA_MACHINE'
  | 'PITCHER'
  | 'WATER_COOLER';

/**
 * Tags for water resources.
 */
export type WaterTag =
  | 'WHEELCHAIR_ACCESSIBLE'
  | 'FILTERED'
  | 'BYOB'
  | 'ID_REQUIRED';

/**
 * Type of food available.
 */
export type FoodType = 'PERISHABLE' | 'NON_PERISHABLE' | 'PREPARED';

/**
 * Distribution type for food resources.
 */
export type DistributionType = 'EAT_ON_SITE' | 'DELIVERY' | 'PICKUP';

/**
 * Organization type for food resources.
 */
export type OrganizationType =
  | 'GOVERNMENT'
  | 'BUSINESS'
  | 'NON_PROFIT'
  | 'UNSURE';

/**
 * Type of foraging resources.
 */
export type ForageType = 'NUT' | 'FRUIT' | 'LEAVES' | 'BARK' | 'FLOWERS';

/**
 * Tags for foraging resources.
 */
export type ForageTag = 'MEDICINAL' | 'IN_SEASON' | 'COMMUNITY_GARDEN';

/**
 * Tags for bathroom resources.
 */
export type BathroomTag =
  | 'WHEELCHAIR_ACCESSIBLE'
  | 'GENDER_NEUTRAL'
  | 'CHANGING_TABLE'
  | 'SINGLE_OCCUPANCY'
  | 'FAMILY';

/**
 * A data source defining where the resource data entry came from.
 */
export type DataSource = {
  /** The type of data source */
  type: DataSourceType;
  /** If available, the URL where this data came from */
  url?: string;
};

/**
 * Details for verification status.
 */
export type Verification = {
  /** Whether or not this resource is currently verified */
  verified: boolean;
  /** The latest date this resource had a verification change */
  last_modified: string | Date;
  /** Who most recently changed the verification state of this resource */
  verifier: string;
};

/**
 * A time object for a place's hours.
 */
export type GooglePlacesTimePoint = {
  /** The date for this time */
  date: string | Date;
  /** Whether or not this time is truncated */
  truncated: boolean;
  /** The day of the week for this time */
  day: number;
  /** The hour for this time */
  hour: number;
  /** The minute for this time */
  minute: number;
};

/**
 * A period of time for a place's hours.
 */
export type GooglePlacesPeriod = {
  /** The closing time for this period */
  close: GooglePlacesTimePoint;
  /** The opening time for this period */
  open: GooglePlacesTimePoint;
};

/**
 * Details for a WATER resource.
 */
export type WaterInfo = {
  /** The type of water dispenser. Can be empty. */
  dispenser_type: DispenserType[];
  /** A list of additional tags regarding this water resource. Can be empty. */
  tags: WaterTag[];
};

/**
 * Details for a FOOD resource.
 */
export type FoodInfo = {
  /** The types of food included in this resource. Must have at least one entry. */
  food_type: FoodType[];
  /** The permitted ways to access the food. Must have at least one entry. */
  distribution_type: DistributionType[];
  /** The type of organization providing this food. Must have at least one entry. */
  organization_type: OrganizationType[];
  /** If available, the name of the organization providing the resource */
  organization_name?: string;
  /** If available, a URL to more information about this food resource */
  organization_url?: string;
};

/**
 * Details for a FORAGE resource.
 */
export type ForageInfo = {
  /** The type of foraging resources this location contains. Must have at least one entry. */
  forage_type: ForageType[];
  /** A list of additional tags regarding this foraging resource. Can be empty. */
  tags: ForageTag[];
};

/**
 * Details for a BATHROOM resource.
 */
export type BathroomInfo = {
  /** A list of additional tags regarding this bathroom resource. Can be empty. */
  tags: BathroomTag[];
};

/**
 * A PHLask resource coming from our backend.
 * This is the main type for a resource entry in the database.
 */
export type ResourceEntry = {
  id?: string;
  /** Represents the schema that this resource entry is following */
  version?: number;
  /** The date this resource was created, in ISO UTC format */
  date_created: string;
  /** Who created this resource */
  creator: string;
  /** The date this resource was last modified, in ISO UTC format */
  last_modified: string;
  /** Who last modified this resource */
  last_modifier: string;
  /** Where this resource data came from */
  source: DataSource;
  /** The verification details of this resource */
  verification: Verification;
  /** The type of resource */
  resource_type: ResourceType;
  /** The street address of the resource (not including city, state, or zip). May include the secondary address. */
  address?: string | null;
  /** The city of the resource */
  city?: string | null;
  /** The 2-letter abbreviation for the state of the resource */
  state?: string | null;
  /** The zip code of the resource */
  zip_code?: string | null;
  /** The latitude of the resource */
  latitude: number;
  /** The longitude of the resource */
  longitude: number;
  /** The Google Places ID of the resource */
  gp_id?: string | null;
  /** A list of S3 keys for images showing this resource */
  images: string[];
  /** Any additional community guidelines or rules for this resource */
  guidelines?: string | null;
  /** A description of the resource */
  description?: string | null;
  /** A non-address name for this location, such as the business name or park name */
  name?: string | null;
  /** The current status of this resource */
  status: ResourceStatus;
  /** What entry permissions are required for this resource */
  entry_type?: EntryType | null;
  /** The hours of operation for this resource, if available */
  hours?: GooglePlacesPeriod[] | null;
  /** If the resource_type is WATER, the information about the water resource */
  water?: WaterInfo | null;
  /** If the resource_type is FOOD, the information about the food resource */
  food?: FoodInfo | null;
  /** If the resource_type is FORAGE, the information about the foraging resource */
  forage?: ForageInfo | null;
  /** If the resource_type is BATHROOM, the information about the bathroom resource */
  bathroom?: BathroomInfo | null;
};

/**
 * Resource type constants for easy use
 */
export const WATER_RESOURCE_TYPE = 'WATER';
export const FOOD_RESOURCE_TYPE = 'FOOD';
export const FORAGE_RESOURCE_TYPE = 'FORAGE';
export const BATHROOM_RESOURCE_TYPE = 'BATHROOM';
