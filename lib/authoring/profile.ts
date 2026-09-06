import "server-only";

import {
  instructorAuthoringProfileResponseSchema,
  type UpdateInstructorProfileRequest,
} from "@/lib/contracts";

import { requireInstructorAuthoringContext } from "./access";
import { AuthoringError, throwAuthoringDatabaseError } from "./errors";

function toProfileResponse(profile: {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
}) {
  return instructorAuthoringProfileResponseSchema.parse({
    data: {
      id: profile.id,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      headline: profile.headline,
      bio: profile.bio,
    },
  });
}

export async function getInstructorProfile() {
  const { supabase, user } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, headline, bio")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throwAuthoringDatabaseError(error, "The instructor profile could not be loaded.");
  }

  if (!data) {
    throw new AuthoringError(404, "profile_not_found", "The instructor profile was not found.");
  }

  return toProfileResponse(data);
}

export async function updateInstructorProfile(input: UpdateInstructorProfileRequest) {
  const { supabase, user } = await requireInstructorAuthoringContext();
  const changes = {
    ...(input.avatarUrl === undefined ? {} : { avatar_url: input.avatarUrl }),
    ...(input.headline === undefined ? {} : { headline: input.headline }),
    ...(input.bio === undefined ? {} : { bio: input.bio }),
  };
  const { data, error } = await supabase
    .from("profiles")
    .update(changes)
    .eq("id", user.id)
    .select("id, full_name, avatar_url, headline, bio")
    .maybeSingle();

  if (error) {
    throwAuthoringDatabaseError(error, "The instructor profile could not be updated.");
  }

  if (!data) {
    throw new AuthoringError(404, "profile_not_found", "The instructor profile was not found.");
  }

  return toProfileResponse(data);
}
