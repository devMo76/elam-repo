import "server-only";

import { AuthoringError } from "./errors";
import { requireInstructorAuthoringContext } from "./access";

export type InstructorPublishingCapability = {
  canDirectPublish: boolean;
  primaryWorkflow: "direct_publish" | "review";
};

export async function getInstructorPublishingCapability(): Promise<InstructorPublishingCapability> {
  const { supabase } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("instructor_direct_publish")
    .eq("id", 1)
    .single();

  if (error || !data) {
    throw new AuthoringError(
      500,
      "publishing_capability_failed",
      "The publishing capability could not be loaded.",
    );
  }

  return {
    canDirectPublish: data.instructor_direct_publish,
    primaryWorkflow: data.instructor_direct_publish ? "direct_publish" : "review",
  };
}
