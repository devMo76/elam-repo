"use client";

import { useEffect, useState, type FormEvent } from "react";

import { AccessibleFormError } from "@/components/ui/AccessibleFormError";
import { formatArabicLessonCount } from "@/lib/catalogue/presentation";
import type { AuthoringApiError, StudioLesson, StudioModule } from "./studio-types";
import { useInstructorUnsavedChanges } from "./InstructorNavigationBlocker";
import { PersistentInstructorVideoUpload } from "./PersistentInstructorVideoUpload";
import styles from "./InstructorWorkspace.module.css";

type ApiData<T> = { data?: T } & AuthoringApiError;

function apiError(payload: AuthoringApiError | null) {
  switch (payload?.error?.code) {
    case "forbidden":
      return "لا تملك صلاحية تعديل هذا المحتوى.";
    case "invalid_authoring_order":
      return "تعذّر حفظ الترتيب. حدّث الصفحة ثم حاول مرة أخرى.";
    case "module_not_found":
    case "lesson_not_found":
      return "لم يعد هذا العنصر متاحًا. حدّث الصفحة للمزامنة.";
    default:
      return "تعذّر حفظ التغيير. تحقّق من الاتصال ثم حاول مرة أخرى.";
  }
}

export function InstructorCurriculumBuilder({
  courseId,
  courseTitle,
  modules,
  editable,
  onModulesChange,
}: {
  courseId: string;
  courseTitle: string;
  modules: StudioModule[];
  editable: boolean;
  onModulesChange: (next: StudioModule[] | ((current: StudioModule[]) => StudioModule[])) => void;
}) {
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorTarget, setErrorTarget] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  function updateModules(next: StudioModule[] | ((current: StudioModule[]) => StudioModule[])) {
    onModulesChange(next);
  }

  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newModuleTitle.trim();
    if (!title) return;

    setError(null);
    setErrorTarget(null);
    setIsCreating(true);

    try {
      const response = await fetch(`/api/instructor/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioModule> | null;

      if (!response.ok || !payload?.data) {
        setErrorTarget("new-module-title");
        setError(apiError(payload));
        return;
      }

      updateModules((current) => [...current, payload.data!]);
      setNewModuleTitle("");
    } catch {
      setErrorTarget("new-module-title");
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsCreating(false);
    }
  }

  async function moveModule(moduleId: string, direction: -1 | 1) {
    const index = modules.findIndex((module) => module.id === moduleId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= modules.length) return;

    const previous = modules;
    const ordered = [...modules];
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    updateModules(ordered);
    setError(null);
    setErrorTarget(null);
    setIsOrdering(true);

    try {
      const response = await fetch(`/api/instructor/courses/${courseId}/modules/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: ordered.map((module) => module.id) }),
      });
      const payload = (await response.json().catch(() => null)) as AuthoringApiError | null;

      if (!response.ok) {
        updateModules(previous);
        setError(apiError(payload));
      }
    } catch {
      updateModules(previous);
      setError("تعذّر الاتصال بالخدمة. عاد الترتيب السابق؛ حاول مرة أخرى.");
    } finally {
      setIsOrdering(false);
    }
  }

  function replaceModule(updatedModule: StudioModule) {
    updateModules((current) => current.map((module) => module.id === updatedModule.id ? updatedModule : module));
  }

  function removeModule(moduleId: string) {
    updateModules((current) => current.filter((module) => module.id !== moduleId));
  }

  if (!editable) {
    return <p className={styles.readOnlyNotice}>المحتوى محفوظ للعرض في هذه الحالة. أعد المقرر إلى مسودة من خلال الجهة المخوّلة قبل تعديل بنيته.</p>;
  }

  return (
    <div className={styles.curriculum}>
      <form className={styles.addRow} onSubmit={createModule}>
        <label className={styles.field}>
          <span>وحدة جديدة</span>
          <input aria-describedby={errorTarget === "new-module-title" ? "curriculum-error" : undefined} aria-invalid={errorTarget === "new-module-title"} disabled={isCreating} id="new-module-title" onChange={(event) => setNewModuleTitle(event.target.value)} placeholder="مثال: أساسيات الإشارات" required value={newModuleTitle} />
        </label>
        <button className={styles.primaryButton} disabled={isCreating} type="submit">{isCreating ? "جارٍ الإضافة…" : "إضافة وحدة"}</button>
      </form>
      {modules.length === 0 ? <p className={styles.readOnlyNotice}>ابدأ بإضافة أول وحدة، ثم أضف دروسها بالترتيب الذي سيظهر للمتعلمين.</p> : null}
      <div className={styles.moduleList}>
        {modules.map((module, index) => (
          <InstructorModuleEditor
            canMoveDown={index < modules.length - 1}
            canMoveUp={index > 0}
            courseId={courseId}
            courseTitle={courseTitle}
            isOrdering={isOrdering}
            initiallyExpanded={index === 0}
            key={module.id}
            module={module}
            onDelete={removeModule}
            onMove={(direction) => void moveModule(module.id, direction)}
            onUpdate={replaceModule}
          />
        ))}
      </div>
      {error ? <AccessibleFormError className={styles.error} id="curriculum-error">{error}</AccessibleFormError> : null}
    </div>
  );
}

function InstructorModuleEditor({
  courseId,
  courseTitle,
  module,
  canMoveUp,
  canMoveDown,
  isOrdering,
  initiallyExpanded,
  onMove,
  onUpdate,
  onDelete,
}: {
  courseId: string;
  courseTitle: string;
  module: StudioModule;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isOrdering: boolean;
  initiallyExpanded: boolean;
  onMove: (direction: -1 | 1) => void;
  onUpdate: (module: StudioModule) => void;
  onDelete: (moduleId: string) => void;
}) {
  const [title, setTitle] = useState(module.title);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [bulkLessonTitles, setBulkLessonTitles] = useState("");
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTarget, setErrorTarget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLessonOrdering, setIsLessonOrdering] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const hasUnsavedModuleFields = title.trim() !== module.title || newLessonTitle.trim().length > 0 || bulkLessonTitles.trim().length > 0;
  useInstructorUnsavedChanges(hasUnsavedModuleFields);

  const processingCount = module.lessons.filter((lesson) =>
    lesson.mediaStatus === "uploading" || lesson.mediaStatus === "processing"
  ).length;
  const failedCount = module.lessons.filter((lesson) => lesson.mediaStatus === "failed").length;

  useEffect(() => {
    function revealTarget() {
      const target = window.location.hash.slice(1);
      const targetedLesson = module.lessons.find(
        (lesson) => target === `lesson-${lesson.id}`,
      );

      if (target === `module-${module.id}` || targetedLesson) {
        setIsExpanded(true);
        if (targetedLesson) setOpenLessonId(targetedLesson.id);
        requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView());
      }
    }

    revealTarget();
    window.addEventListener("hashchange", revealTarget);
    return () => window.removeEventListener("hashchange", revealTarget);
  }, [module.id, module.lessons]);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = title.trim();
    if (!value || value === module.title) return;

    setError(null);
    setErrorTarget(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/modules/${module.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value }),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioModule> | null;
      if (!response.ok || !payload?.data) {
        setErrorTarget(`module-title-${module.id}`);
        setError(apiError(payload));
        return;
      }
      onUpdate({ ...payload.data!, lessons: module.lessons });
    } catch {
      setErrorTarget(`module-title-${module.id}`);
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newLessonTitle.trim();
    if (!title) return;

    setError(null);
    setErrorTarget(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/modules/${module.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioLesson> | null;
      if (!response.ok || !payload?.data) {
        setErrorTarget(`new-lesson-${module.id}`);
        setError(apiError(payload));
        return;
      }
      onUpdate({ ...module, lessons: [...module.lessons, payload.data!] });
      setNewLessonTitle("");
    } catch {
      setErrorTarget(`new-lesson-${module.id}`);
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addLessons(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const titles = bulkLessonTitles
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (titles.length === 0) return;

    setError(null);
    setErrorTarget(null);
    setIsBulkCreating(true);
    try {
      const response = await fetch(`/api/instructor/modules/${module.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),
      });
      const payload = (await response.json().catch(() => null)) as
        | ApiData<StudioLesson[]>
        | null;

      if (!response.ok || !payload?.data) {
        setErrorTarget(`bulk-lessons-${module.id}`);
        setError(apiError(payload));
        return;
      }

      onUpdate({ ...module, lessons: [...module.lessons, ...payload.data] });
      setBulkLessonTitles("");
      setOpenLessonId(payload.data[0]?.id ?? null);
    } catch {
      setErrorTarget(`bulk-lessons-${module.id}`);
      setError("تعذّر الاتصال بالخدمة. بقيت العناوين محفوظة هنا؛ حاول مرة أخرى.");
    } finally {
      setIsBulkCreating(false);
    }
  }

  async function duplicateLesson(lessonId: string) {
    setError(null);
    setErrorTarget(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/lessons/${lessonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const payload = (await response.json().catch(() => null)) as
        | ApiData<StudioLesson>
        | null;

      if (!response.ok || !payload?.data) {
        setError(apiError(payload));
        return;
      }

      const sourceIndex = module.lessons.findIndex((lesson) => lesson.id === lessonId);
      const lessons = [...module.lessons];
      lessons.splice(sourceIndex + 1, 0, payload.data);
      onUpdate({
        ...module,
        lessons: lessons.map((lesson, index) => ({ ...lesson, position: index + 1 })),
      });
      setOpenLessonId(payload.data.id);
    } catch {
      setError("تعذّر نسخ الدرس. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteModule() {
    setError(null);
    setErrorTarget(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/modules/${module.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AuthoringApiError | null;
        setError(apiError(payload));
        return;
      }
      onDelete(module.id);
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function moveLesson(lessonId: string, direction: -1 | 1) {
    const index = module.lessons.findIndex((lesson) => lesson.id === lessonId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= module.lessons.length) return;

    const previousLessons = module.lessons;
    const orderedLessons = [...module.lessons];
    [orderedLessons[index], orderedLessons[targetIndex]] = [orderedLessons[targetIndex], orderedLessons[index]];
    onUpdate({ ...module, lessons: orderedLessons });
    setError(null);
    setErrorTarget(null);
    setIsLessonOrdering(true);

    try {
      const response = await fetch(`/api/instructor/modules/${module.id}/lessons/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonIds: orderedLessons.map((lesson) => lesson.id) }),
      });
      const payload = (await response.json().catch(() => null)) as AuthoringApiError | null;
      if (!response.ok) {
        onUpdate({ ...module, lessons: previousLessons });
        setError(apiError(payload));
      }
    } catch {
      onUpdate({ ...module, lessons: previousLessons });
      setError("تعذّر الاتصال بالخدمة. عاد الترتيب السابق؛ حاول مرة أخرى.");
    } finally {
      setIsLessonOrdering(false);
    }
  }

  return (
    <section className={styles.module} id={`module-${module.id}`}>
      <div className={styles.moduleSummary}>
        <button
          aria-controls={`module-body-${module.id}`}
          aria-expanded={isExpanded}
          className={styles.moduleToggle}
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <span>
            <strong>{module.title}</strong>
            <small>{formatArabicLessonCount(module.lessons.length)}</small>
          </span>
          <span className={styles.moduleSignals}>
            {processingCount > 0 ? <small>{processingCount} قيد التجهيز</small> : null}
            {failedCount > 0 ? <small className={styles.problemSignal}>{failedCount} يحتاج متابعة</small> : null}
            <small>{isExpanded ? "طي" : "فتح"}</small>
          </span>
        </button>
        <div className={styles.rowActions}>
          <button className={styles.textButton} disabled={!canMoveUp || isOrdering} onClick={() => onMove(-1)} type="button">نقل لأعلى</button>
          <button className={styles.textButton} disabled={!canMoveDown || isOrdering} onClick={() => onMove(1)} type="button">نقل لأسفل</button>
          {!confirmingDelete ? <button className={styles.dangerTextButton} disabled={isSaving} onClick={() => setConfirmingDelete(true)} type="button">حذف الوحدة</button> : null}
        </div>
      </div>
      {confirmingDelete ? (
        <div className={styles.inlineConfirmation} role="group" aria-label={`تأكيد حذف ${module.title}`}>
          <p>سيُحذف محتوى هذه الوحدة ودروسها من المسودة. هل تريد المتابعة؟</p>
          <button className={styles.dangerButton} disabled={isSaving} onClick={() => void deleteModule()} type="button">{isSaving ? "جارٍ الحذف…" : "تأكيد الحذف"}</button>
          <button className={styles.quietButton} disabled={isSaving} onClick={() => setConfirmingDelete(false)} type="button">إلغاء</button>
        </div>
      ) : null}
      {isExpanded ? <div className={styles.moduleBody} id={`module-body-${module.id}`}>
        <form className={styles.inlineForm} onSubmit={rename}>
          <label className="sr-only" htmlFor={`module-title-${module.id}`}>عنوان الوحدة</label>
          <input aria-describedby={errorTarget === `module-title-${module.id}` ? `module-error-${module.id}` : undefined} aria-invalid={errorTarget === `module-title-${module.id}`} id={`module-title-${module.id}`} onChange={(event) => setTitle(event.target.value)} value={title} />
          {title.trim() !== module.title ? <button className={styles.textButton} disabled={isSaving} type="submit">حفظ الاسم</button> : null}
        </form>
        <div className={styles.lessonList}>
        {module.lessons.map((lesson, index) => (
          <InstructorLessonEditor
            canMoveDown={index < module.lessons.length - 1}
            canMoveUp={index > 0}
            courseId={courseId}
            courseTitle={courseTitle}
            index={index}
            isOrdering={isLessonOrdering}
            moduleBusy={isSaving}
            key={lesson.id}
            lesson={lesson}
            module={module}
            onDuplicate={() => void duplicateLesson(lesson.id)}
            onMove={(direction) => void moveLesson(lesson.id, direction)}
            onToggle={() => setOpenLessonId((current) => current === lesson.id ? null : lesson.id)}
            onUpdate={onUpdate}
            open={openLessonId === lesson.id}
          />
        ))}
        </div>
        <form className={styles.addLessonRow} onSubmit={addLesson}>
          <label className="sr-only" htmlFor={`new-lesson-${module.id}`}>عنوان الدرس الجديد</label>
          <input aria-describedby={errorTarget === `new-lesson-${module.id}` ? `module-error-${module.id}` : undefined} aria-invalid={errorTarget === `new-lesson-${module.id}`} disabled={isSaving} id={`new-lesson-${module.id}`} onChange={(event) => setNewLessonTitle(event.target.value)} placeholder="عنوان الدرس الجديد" required value={newLessonTitle} />
          <button className={styles.textButton} disabled={isSaving} type="submit">إضافة درس</button>
        </form>
        <details className={styles.quickAdd}>
          <summary>إضافة عدة دروس</summary>
          <form onSubmit={addLessons}>
            <label className={styles.field} htmlFor={`bulk-lessons-${module.id}`}>
              <span>عنوان واحد في كل سطر</span>
              <textarea aria-describedby={errorTarget === `bulk-lessons-${module.id}` ? `module-error-${module.id}` : undefined} aria-invalid={errorTarget === `bulk-lessons-${module.id}`} disabled={isBulkCreating} id={`bulk-lessons-${module.id}`} onChange={(event) => setBulkLessonTitles(event.target.value)} rows={5} value={bulkLessonTitles} />
            </label>
            <button className={styles.textButton} disabled={isBulkCreating || !bulkLessonTitles.trim()} type="submit">{isBulkCreating ? "جارٍ الإضافة…" : "إضافة العناوين"}</button>
          </form>
        </details>
      </div> : null}
      {error ? <AccessibleFormError className={styles.error} id={`module-error-${module.id}`}>{error}</AccessibleFormError> : null}
    </section>
  );
}

function InstructorLessonEditor({
  courseId,
  courseTitle,
  lesson,
  module,
  index,
  canMoveUp,
  canMoveDown,
  isOrdering,
  moduleBusy,
  open,
  onDuplicate,
  onMove,
  onToggle,
  onUpdate,
}: {
  courseId: string;
  courseTitle: string;
  lesson: StudioLesson;
  module: StudioModule;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isOrdering: boolean;
  moduleBusy: boolean;
  open: boolean;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggle: () => void;
  onUpdate: (module: StudioModule) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleHasError, setTitleHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasUnsavedTitle = title.trim() !== lesson.title;
  useInstructorUnsavedChanges(hasUnsavedTitle);

  function replaceLesson(updatedLesson: StudioLesson) {
    onUpdate({ ...module, lessons: module.lessons.map((item) => item.id === updatedLesson.id ? updatedLesson : item) });
  }

  async function saveLesson(changes: Partial<Pick<StudioLesson, "title" | "isFreePreview">>) {
    setError(null);
    setTitleHasError(false);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioLesson> | null;
      if (!response.ok || !payload?.data) {
        setTitleHasError("title" in changes);
        setError(apiError(payload));
        return;
      }
      replaceLesson(payload.data!);
    } catch {
      setTitleHasError("title" in changes);
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLesson() {
    setError(null);
    setTitleHasError(false);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/lessons/${lesson.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AuthoringApiError | null;
        setError(apiError(payload));
        return;
      }
      onUpdate({ ...module, lessons: module.lessons.filter((item) => item.id !== lesson.id) });
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className={styles.lesson} id={`lesson-${lesson.id}`}>
      <div className={styles.lessonSummary}>
        <span className={styles.lessonPosition}><bdi dir="ltr">{index + 1}</bdi></span>
        <button aria-expanded={open} className={styles.lessonToggle} onClick={onToggle} type="button">
          <span>{lesson.title}</span>
          <small>{lesson.mediaStatus === "ready" ? "جاهز" : lesson.mediaStatus === "processing" ? "قيد التجهيز" : lesson.mediaStatus === "uploading" ? "جارٍ الرفع" : lesson.mediaStatus === "failed" ? "يحتاج متابعة" : "بلا فيديو"}</small>
        </button>
        <div className={styles.rowActions}>
          <button className={styles.textButton} disabled={!canMoveUp || isOrdering || isSaving} onClick={() => onMove(-1)} type="button">نقل لأعلى</button>
          <button className={styles.textButton} disabled={!canMoveDown || isOrdering || isSaving} onClick={() => onMove(1)} type="button">نقل لأسفل</button>
          <button className={styles.textButton} disabled={isSaving || moduleBusy} onClick={onDuplicate} type="button">نسخ الدرس</button>
          {!confirmingDelete ? <button className={styles.dangerTextButton} disabled={isSaving} onClick={() => setConfirmingDelete(true)} type="button">حذف الدرس</button> : null}
        </div>
      </div>
      {open ? <div className={styles.lessonMain}>
        <div className={styles.lessonFields}>
          <label className="sr-only" htmlFor={`lesson-title-${lesson.id}`}>عنوان الدرس</label>
          <input aria-describedby={titleHasError ? `lesson-error-${lesson.id}` : undefined} aria-invalid={titleHasError} id={`lesson-title-${lesson.id}`} onChange={(event) => setTitle(event.target.value)} value={title} />
          <div className={styles.lessonMeta}>
            <label className={styles.checkLabel}>
              <input checked={lesson.isFreePreview} disabled={isSaving} onChange={(event) => void saveLesson({ isFreePreview: event.target.checked })} type="checkbox" />
              درس مجاني للمعاينة
            </label>
          </div>
          <PersistentInstructorVideoUpload courseId={courseId} courseTitle={courseTitle} lessonId={lesson.id} lessonTitle={lesson.title} initialStatus={lesson.mediaStatus} onStatusChange={(mediaStatus) => replaceLesson({ ...lesson, mediaStatus })} />
        </div>
        <div className={styles.rowActions}>
          {hasUnsavedTitle ? <span className={styles.unsaved}>غير محفوظ</span> : null}
          {hasUnsavedTitle ? <button className={styles.textButton} disabled={isSaving || !title.trim()} onClick={() => void saveLesson({ title: title.trim() })} type="button">{isSaving ? "جارٍ الحفظ…" : "حفظ الاسم"}</button> : null}
        </div>
      </div> : null}
      {confirmingDelete ? (
        <div className={styles.inlineConfirmation} role="group" aria-label={`تأكيد حذف ${lesson.title}`}>
          <p>سيُحذف هذا الدرس من المسودة. هل تريد المتابعة؟</p>
          <button className={styles.dangerButton} disabled={isSaving} onClick={() => void deleteLesson()} type="button">تأكيد الحذف</button>
          <button className={styles.quietButton} disabled={isSaving} onClick={() => setConfirmingDelete(false)} type="button">إلغاء</button>
        </div>
      ) : null}
      {error ? <AccessibleFormError className={styles.error} id={`lesson-error-${lesson.id}`}>{error}</AccessibleFormError> : null}
    </article>
  );
}
