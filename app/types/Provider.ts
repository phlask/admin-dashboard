/**
 * An organization that supplies one or more PHLask resources.
 *
 * Surfaced on the map as the "Provided By" attribution beneath a resource.
 */
export type Provider = {
  id: number;
  /** The date this provider was added, in ISO UTC format */
  created_at: string;
  /** The display name of the organization */
  name: string;
  /** If available, a URL to the organization's logo */
  logo_url?: string | null;
  /** If available, a URL to the organization's website */
  website_url?: string | null;
};

/** The fields a maintainer can set when creating or editing a provider */
export type ProviderInput = Pick<Provider, "name"> &
  Partial<Pick<Provider, "logo_url" | "website_url">>;
