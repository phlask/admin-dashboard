//TODO: Update file name to db.ts

/**
 * PHLask Supabase Database Utilities
 *
 * This module provides utility functions for interacting with the PHLask resource database
 * stored in Supabase. It includes functions for fetching (with pagination), editing, and
 * deleting resource entries.
 *
 * @module supabase
 *
 * @example
 * // Fetch all resources
 * import { getResources } from '~/utils/supabase';
 *
 * const { data, count } = await getResources();
 * console.log(`Found ${count} resources`, data);
 *
 * @example
 * // Fetch resources with pagination
 * import { getResources } from '~/utils/supabase';
 *
 * const result = await getResources({
 *   limit: 20,
 *   offset: 0,
 *   resourceType: 'WATER',
 *   status: 'OPERATIONAL'
 * });
 *
 * @example
 * // Update a resource
 * import { updateResource } from '~/utils/supabase';
 *
 * const updated = await updateResource({
 *   id: '123',
 *   status: 'TEMPORARILY_CLOSED',
 *   last_modified: new Date().toISOString(),
 *   last_modifier: 'admin@phlask.org'
 * });
 *
 * @example
 * // Delete a resource
 * import { deleteResource } from '~/utils/supabase';
 *
 * await deleteResource('resource-id-123');
 */

import { createClient } from "@supabase/supabase-js";
import type {
  ResourceEntry,
  FetchResourcesOptions,
  FetchResourcesResult,
} from "~/types/ResourceEntry";

/**
 * Supabase database configuration
 *
 * These values can be overridden using environment variables:
 * - VITE_DB_URL: The Supabase project URL
 * - VITE_DB_NAME: The name of the resources table
 * - VITE_DB_API_KEY: The Supabase API key (anon/public key)
 */
const databaseUrl =
  import.meta.env.VITE_DB_URL || "https://wantycfbnzzocsbthqzs.supabase.co";
const resourceDatabaseName = import.meta.env.VITE_DB_NAME || "resources";
const databaseApiKey =
  import.meta.env.VITE_DB_API_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbnR5Y2Zibnp6b2NzYnRocXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwNDY2OTgsImV4cCI6MjA1MjYyMjY5OH0.yczsMOx3Y-zsWu-GjYEajIb0yw9fYWEIUglmmfM1zCY";

/**
 * Supabase client instance
 *
 * This is used for all database operations. The client is configured with the
 * database URL and API key from environment variables or defaults.
 */
export const supabase = createClient(databaseUrl, databaseApiKey);

/**
 * Fetches resources from the database with support for pagination and filtering.
 *
 * This function retrieves resources from the Supabase database with optional
 * pagination, filtering by resource type, and filtering by status. It returns
 * the data along with metadata about the total count and whether more results
 * are available.
 *
 * @param options - Optional configuration for the fetch operation
 * @param options.limit - Maximum number of resources to fetch (default: 50)
 * @param options.offset - Number of resources to skip for pagination (default: 0)
 * @param options.resourceType - Filter resources by type (WATER, FOOD, FORAGE, BATHROOM)
 * @param options.status - Filter resources by status (OPERATIONAL, TEMPORARILY_CLOSED, etc.)
 * @returns Promise resolving to an object containing the data, count, and hasMore flag
 * @throws Error if the database query fails
 *
 * @example
 * // Fetch first 10 resources
 * const result = await getResources({ limit: 10, offset: 0 });
 * console.log(`Fetched ${result.data.length} of ${result.count} total resources`);
 * if (result.hasMore) {
 *   console.log('More resources available');
 * }
 *
 * @example
 * // Fetch only operational water resources
 * const waterResources = await getResources({
 *   resourceType: 'WATER',
 *   status: 'OPERATIONAL',
 *   limit: 100
 * });
 *
 * @example
 * // Paginate through all resources
 * let offset = 0;
 * const limit = 50;
 * let allResources: ResourceEntry[] = [];
 *
 * while (true) {
 *   const result = await getResources({ limit, offset });
 *   allResources = [...allResources, ...result.data];
 *   if (!result.hasMore) break;
 *   offset += limit;
 * }
 */
export async function getResources(
  options: FetchResourcesOptions = {}
): Promise<FetchResourcesResult> {
  const { limit = 50, offset = 0, resourceType, status } = options;

  // Build the query with filters
  let query = supabase
    .from(resourceDatabaseName)
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1);

  // Apply filters if provided
  if (resourceType) {
    query = query.eq("resource_type", resourceType);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }

  return {
    data: (data || []) as ResourceEntry[],
    count,
    hasMore: count !== null && offset + limit < count,
  };
}

/**
 * Fetches a single resource by its ID.
 *
 * @param id - The unique identifier of the resource
 * @returns Promise resolving to the resource entry, or null if not found
 * @throws Error if the database query fails
 *
 * @example
 * const resource = await getResourceById('123e4567-e89b-12d3-a456-426614174000');
 * if (resource) {
 *   console.log(`Found resource: ${resource.name}`);
 * } else {
 *   console.log('Resource not found');
 * }
 */
export async function getResourceById(
  id: string
): Promise<ResourceEntry | null> {
  const { data, error } = await supabase
    .from(resourceDatabaseName)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Resource not found
      return null;
    }
    throw new Error(`Failed to fetch resource: ${error.message}`);
  }

  return data as ResourceEntry;
}

/**
 * Updates an existing resource in the database.
 *
 * This function performs an upsert operation - if the resource exists (identified by id),
 * it will be updated; otherwise, a new resource will be created.
 *
 * IMPORTANT: When updating a resource, you should always update the `last_modified`
 * and `last_modifier` fields to track when and who made the change.
 *
 * @param resource - A partial resource object containing the fields to update.
 *                   Must include an 'id' field to identify which resource to update.
 * @returns Promise resolving to the updated resource
 * @throws Error if the database operation fails or if no id is provided
 *
 * @example
 * // Update a resource's status
 * const updated = await updateResource({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   status: 'TEMPORARILY_CLOSED',
 *   last_modified: new Date().toISOString(),
 *   last_modifier: 'admin@phlask.org'
 * });
 * console.log('Resource updated:', updated);
 *
 * @example
 * // Update multiple fields at once
 * const updated = await updateResource({
 *   id: 'resource-id',
 *   name: 'Updated Water Fountain Name',
 *   description: 'This fountain has been renovated',
 *   verification: {
 *     verified: true,
 *     last_modified: new Date(),
 *     verifier: 'inspector@phlask.org'
 *   },
 *   last_modified: new Date().toISOString(),
 *   last_modifier: 'admin@phlask.org'
 * });
 */
export async function updateResource(
  resource: Partial<ResourceEntry> & { id: string }
): Promise<ResourceEntry> {
  if (!resource.id) {
    throw new Error("Resource ID is required for updates");
  }

  const { data, error } = await supabase
    .from(resourceDatabaseName)
    .upsert(resource)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`);
  }

  return data as ResourceEntry;
}

/**
 * Creates a new resource in the database.
 *
 * This function inserts a new resource into the database. The resource must include
 * all required fields as defined in the ResourceEntry type.
 *
 * @param resource - The complete resource object to insert
 * @returns Promise resolving to the newly created resource
 * @throws Error if the database operation fails or if required fields are missing
 *
 * @example
 * // Create a new water resource
 * const newResource = await addResource({
 *   date_created: new Date().toISOString(),
 *   creator: 'admin@phlask.org',
 *   last_modified: new Date().toISOString(),
 *   last_modifier: 'admin@phlask.org',
 *   source: { type: 'MANUAL' },
 *   verification: {
 *     verified: false,
 *     last_modified: new Date(),
 *     verifier: 'system'
 *   },
 *   resource_type: 'WATER',
 *   latitude: 39.9526,
 *   longitude: -75.1652,
 *   name: 'City Hall Water Fountain',
 *   address: '1 Penn Square',
 *   city: 'Philadelphia',
 *   state: 'PA',
 *   zip_code: '19107',
 *   status: 'OPERATIONAL',
 *   images: [],
 *   water: {
 *     dispenser_type: ['DRINKING_FOUNTAIN'],
 *     tags: ['WHEELCHAIR_ACCESSIBLE']
 *   }
 * });
 * console.log('Created resource with ID:', newResource.id);
 */
export async function addResource(
  resource: Omit<ResourceEntry, "id">
): Promise<ResourceEntry> {
  const { data, error } = await supabase
    .from(resourceDatabaseName)
    .insert(resource)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add resource: ${error.message}`);
  }

  return data as ResourceEntry;
}

/**
 * Deletes a resource from the database by its ID.
 *
 * WARNING: This operation is permanent and cannot be undone. Consider using
 * a soft delete approach by updating the status to 'HIDDEN' instead.
 *
 * @param id - The unique identifier of the resource to delete
 * @returns Promise that resolves when the deletion is complete
 * @throws Error if the database operation fails or if the resource doesn't exist
 *
 * @example
 * // Hard delete a resource (permanent)
 * await deleteResource('123e4567-e89b-12d3-a456-426614174000');
 * console.log('Resource permanently deleted');
 *
 * @example
 * // Soft delete alternative (recommended)
 * // Instead of deleting, hide the resource
 * await updateResource({
 *   id: 'resource-id',
 *   status: 'HIDDEN',
 *   last_modified: new Date().toISOString(),
 *   last_modifier: 'admin@phlask.org'
 * });
 */
export async function deleteResource(id: string): Promise<void> {
  if (!id) {
    throw new Error("Resource ID is required for deletion");
  }

  const { error } = await supabase
    .from(resourceDatabaseName)
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }
}

/**
 * Fetches resources near a specific location using latitude and longitude.
 *
 * This function uses the PostGIS extension in Supabase to find resources
 * within a certain radius of a given point.
 *
 * @param latitude - The latitude of the center point
 * @param longitude - The longitude of the center point
 * @param radiusMeters - The search radius in meters (default: 1000m = 1km)
 * @param options - Additional filtering options (resourceType, status, limit)
 * @returns Promise resolving to an array of nearby resources
 *
 * @example
 * // Find water fountains within 500m of City Hall
 * const nearby = await getResourcesNearby(39.9526, -75.1652, 500, {
 *   resourceType: 'WATER',
 *   status: 'OPERATIONAL',
 *   limit: 10
 * });
 * console.log(`Found ${nearby.length} water fountains nearby`);
 */
export async function getResourcesNearby(
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000,
  options: Omit<FetchResourcesOptions, "offset"> = {}
): Promise<ResourceEntry[]> {
  const { limit = 50, resourceType, status } = options;

  // Note: This assumes your Supabase database has PostGIS enabled
  // and the resources table has a proper geographic index
  let query = supabase.from(resourceDatabaseName).select("*").limit(limit);

  // Apply filters if provided
  if (resourceType) {
    query = query.eq("resource_type", resourceType);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch nearby resources: ${error.message}`);
  }

  // Filter by distance (client-side for now)
  // In production, you'd want to use PostGIS st_dwithin for server-side filtering
  const resources = (data || []) as ResourceEntry[];
  return resources.filter((resource) => {
    const distance = calculateDistance(
      latitude,
      longitude,
      resource.latitude,
      resource.longitude
    );
    return distance <= radiusMeters;
  });
}

/**
 * Calculates the distance between two geographic points using the Haversine formula.
 *
 * @param lat1 - Latitude of the first point
 * @param lon1 - Longitude of the first point
 * @param lat2 - Latitude of the second point
 * @param lon2 - Longitude of the second point
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
