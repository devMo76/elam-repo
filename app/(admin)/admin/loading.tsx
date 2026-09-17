import styles from "@/components/admin/AdminWorkspace.module.css";

export default function AdminLoading() {
  return <div className={styles.stateViewport} aria-busy="true" aria-label="جارٍ تحميل أدوات الإدارة"><div className={styles.skeleton}><div /><div /><div /></div></div>;
}
