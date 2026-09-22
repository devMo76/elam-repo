export type EditorSaveState = "pristine" | "dirty" | "saving" | "saved" | "failed";

export function getEditorSaveState({
  dirty,
  saving,
  saved,
  failed,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  failed: boolean;
}): EditorSaveState {
  if (saving) return "saving";
  if (failed) return "failed";
  if (dirty) return "dirty";
  if (saved) return "saved";
  return "pristine";
}
