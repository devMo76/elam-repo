import { instructorWorkspaceStyles as styles } from "@/components/instructor/InstructorPage";

export default function StudioLoading() {
  return (
    <div aria-busy="true" aria-label="جارٍ تحميل استوديو المدرّس" className={styles.stateViewport}>
      <div className={styles.skeleton}><div /><div /><div /></div>
    </div>
  );
}
