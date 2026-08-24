import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SiteSettingValue {
  value: string | null;
  type: string;
}

export type SiteSettingsMap = Record<string, SiteSettingValue>;

async function fetchSettings(): Promise<SiteSettingsMap> {
  try {
    const res = await fetch("/api/settings", {});
    if (!res.ok) return {};
    const data = await res.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return data;
  } catch (_err) {
    return {};
  }
}

export function useSiteSettings() {
  const query = useQuery<SiteSettingsMap>({
    queryKey: ["site-settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 60, // 1 hour — settings only change via admin save
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  const data = query.data;

  const get = useCallback(
    (key: string, fallback = "") => data?.[key]?.value ?? fallback,
    [data],
  );

  const getJson = useCallback(
    <T>(key: string, fallback: T): T => {
      const val = data?.[key]?.value;
      if (!val) return fallback;
      try {
        return JSON.parse(val) as T;
      } catch {
        return fallback;
      }
    },
    [data],
  );

  return { settings: data, get, getJson, isLoading: query.isLoading, isError: query.isError };
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: { key: string; value: string; type?: string }[]) => {
      const res = await fetch("/api/settings/batch", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
}

export const SETTINGS_KEYS = {
  // Hero
  HERO_TITLE: "hero_title",
  HERO_SUBTITLE: "hero_subtitle",
  HERO_DESC: "hero_desc",
  HERO_BADGE: "hero_badge",
  HERO_PHOTO_URL: "hero_photo_url",

  // About
  ABOUT_TITLE: "about_title",
  ABOUT_DESC: "about_desc",
  ABOUT_IMAGE_URL: "about_image_url",
  ABOUT_YEARS: "about_years",
  ABOUT_STUDENTS: "about_students",
  ABOUT_TRACKS: "about_tracks",

  // Offline Centers
  OFFLINE_CENTERS_LIST: "offline_centers_list",

  // Services, Pricing, Testimonials, FAQ
  SERVICES_LIST: "services_list",
  PRICING_LIST: "pricing_list",
  TESTIMONIALS_LIST: "testimonials_list",
  FAQ_LIST: "faq_list",

  // Portfolio
  PORTFOLIO_LIST: "portfolio_list",

  // Background Images
  EDUVERSE_IMAGE_URL: "eduverse_image_url",
  WHY_CHOOSE_ME_BG_URL: "why_choose_me_bg_url",
  TESTIMONIALS_BG_URL: "testimonials_bg_url",

  // Contact
  CONTACT_WHATSAPP: "contact_whatsapp",
  CONTACT_PHONE1: "contact_phone1",
  CONTACT_PHONE2: "contact_phone2",
  CONTACT_PHONE3: "contact_phone3",
  CONTACT_ADDRESS: "contact_address",
  CONTACT_MAPS_URL: "contact_maps_url",

  // Social
  SOCIAL_FACEBOOK: "social_facebook",
  SOCIAL_INSTAGRAM: "social_instagram",
  SOCIAL_YOUTUBE: "social_youtube",
  SOCIAL_LINKEDIN: "social_linkedin",

  // General
  SITE_NAME: "site_name",
  SITE_TAGLINE: "site_tagline",
  SITE_SEO_DESC: "site_seo_desc",
  SITE_SEO_KEYWORDS: "site_seo_keywords",
  SITE_LOGO_URL: "site_logo_url",
  SITE_FAVICON_URL: "site_favicon_url",
} as const;
