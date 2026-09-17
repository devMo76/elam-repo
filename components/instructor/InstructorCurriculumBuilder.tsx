"use client";

import { useState, type FormEvent } from "react";

import type { AuthoringApiError, StudioLesson, StudioModule } from "./studio-types";
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
  initialModules,
  editable,
}: {
  courseId: string;
  initialModules: StudioModule[];
  editable: boolean;
}) {
  const [modules, setModules] = useState(initialModules);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newModuleTitle.trim();
    if (!title) return;

    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch(`/api/instructor/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioModule> | null;

      if (!response.ok || !payload?.data) {
        setError(apiError(payload));
        return;
      }

      setModules((current) => [...current, payload.data!]);
      setNewModuleTitle("");
    } catch {
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
    setModules(ordered);
    setError(null);
    setIsOrdering(true);

    try {
      const response = await fetch(`/api/instructor/courses/${courseId}/modules/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: ordered.map((module) => module.id) }),
      });
      const payload = (await response.json().catch(() => null)) as AuthoringApiError | null;

      if (!response.ok) {
        setModules(previous);
        setError(apiError(payload));
      }
    } catch {
      setModules(previous);
      setError("تعذّر الاتصال بالخدمة. عاد الترتيب السابق؛ حاول مرة أخرى.");
    } finally {
      setIsOrdering(false);
    }
  }

  function replaceModule(updatedModule: StudioModule) {
    setModules((current) => current.map((module) => module.id === updatedModule.id ? updatedModule : module));
  }

  function removeModule(moduleId: string) {
    setModules((current) => current.filter((module) => module.id !== moduleId));
  }

  if (!editable) {
    return <p className={styles.readOnlyNotice}>المحتوى محفوظ للعرض في هذه الحالة. أعد المقرر إلى مسودة من خلال الجهة المخوّلة قبل تعديل بنيته.</p>;
  }

  return (
    <div className={styles.curriculum}>
      <form className={styles.addRow} onSubmit={createModule}>
        <label className={styles.field}>
          <span>وحدة جديدة</span>
          <input disabled={isCreating} onChange={(event) => setNewModuleTitle(event.target.value)} placeholder="مثال: أساسيات الإشارات" required value={newModuleTitle} />
        </label>
        <button className={styles.primaryButton} disabled={isCreating} type="submit">{isCreating ? "جارٍ الإضافة…" : "إضافة وحدة"}</button>
      </form>
      {modules.length === 0 ? <p className={styles.readOnlyNotice}>ابدأ بإضافة أول وحدة، ثم أضف دروسها بالترتيب الذي سيظهر للمتعلمين.</p> : null}
      <div className={styles.moduleList}>
        {modules.map((module, index) => (
          <InstructorModuleEditor
            canMoveDown={index < modules.length - 1}
            canMoveUp={index > 0}
            isOrdering={isOrdering}
            key={module.id}
            module={module}
            onDelete={removeModule}
            onMove={(direction) => void moveModule(module.id, direction)}
            onUpdate={replaceModule}
          />
        ))}
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}

function InstructorModuleEditor({
  module,
  canMoveUp,
  canMoveDown,
  isOrdering,
  onMove,
  onUpdate,
  onDelete,
}: {
  module: StudioModule;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isOrdering: boolean;
  onMove: (direction: -1 | 1) => void;
  onUpdate: (module: StudioModule) => void;
  onDelete: (moduleId: string) => void;
}) {
  const [title, setTitle] = useState(module.title);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLessonOrdering, setIsLessonOrdering] = useState(false);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = title.trim();
    if (!value || value === module.title) return;

    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/modules/${module.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value }),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioModule> | null;
      if (!response.ok || !payload?.data) {
        setError(apiError(payload));
        return;
      }
      onUpdate({ ...payload.data!, lessons: module.lessons });
    } catch {
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
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/modules/${module.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioLesson> | null;
      if (!response.ok || !payload?.data) {
        setError(apiError(payload));
        return;
      }
      onUpdate({ ...module, lessons: [...module.lessons, payload.data!] });
      setNewLessonTitle("");
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteModule() {
    setError(null);
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
    <section className={styles.module}>
      <div className={styles.moduleHeader}>
        <form className={styles.inlineForm} onSubmit={rename}>
          <label className="sr-only" htmlFor={`module-${module.id}`}>عنوان الوحدة</label>
          <input id={`module-${module.id}`} onChange={(event) => setTitle(event.target.value)} value={title} />
          {title.trim() !== module.title ? <button className={styles.textButton} disabled={isSaving} type="submit">حفظ الاسم</button> : null}
        </form>
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
      <div className={styles.lessonList}>
        {module.lessons.map((lesson, index) => (
          <InstructorLessonEditor
            canMoveDown={index < module.lessons.length - 1}
            canMoveUp={index > 0}
            index={index}
            isOrdering={isLessonOrdering}
            key={lesson.id}
            lesson={lesson}
            module={module}
            onMove={(direction) => void moveLesson(lesson.id, direction)}
            onUpdate={onUpdate}
          />
        ))}
      </div>
      <form className={styles.addLessonRow} onSubmit={addLesson}>
        <label className="sr-only" htmlFor={`new-lesson-${module.id}`}>عنوان الدرس الجديد</label>
        <input disabled={isSaving} id={`new-lesson-${module.id}`} onChange={(event) => setNewLessonTitle(event.target.value)} placeholder="عنوان الدرس الجديد" required value={newLessonTitle} />
        <button className={styles.textButton} disabled={isSaving} type="submit">إضافة درس</button>
      </form>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}

function InstructorLessonEditor({
  lesson,
  module,
  index,
  canMoveUp,
  canMoveDown,
  isOrdering,
  onMove,
  onUpdate,
}: {
  lesson: StudioLesson;
  module: StudioModule;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isOrdering: boolean;
  onMove: (direction: -1 | 1) => void;
  onUpdate: (module: StudioModule) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function replaceLesson(updatedLesson: StudioLesson) {
    onUpdate({ ...module, lessons: module.lessons.map((item) => item.id === updatedLesson.id ? updatedLesson : item) });
  }

  async function saveLesson(changes: Partial<Pick<StudioLesson, "title" | "isFreePreview">>) {
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = (await response.json().catch(() => null)) as ApiData<StudioLesson> | null;
      if (!response.ok || !payload?.data) {
        setError(apiError(payload));
        return;
      }
      replaceLesson(payload.data!);
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLesson() {
    setError(null);
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
    <article className={styles.lesson}>
      <div className={styles.lessonMain}>
        <span className={styles.lessonPosition}><bdi dir="ltr">{index + 1}</bdi></span>
        <div className={styles.lessonFields}>
          <label className="sr-only" htmlFor={`lesson-${lesson.id}`}>عنوان الدرس</label>
          <input id={`lesson-${lesson.id}`} onChange={(event) => setTitle(event.target.value)} value={title} />
          <div className={styles.lessonMeta}>
            <label className={styles.checkLabel}>
              <input checked={lesson.isFreePreview} disabled={isSaving} onChange={(event) => void saveLesson({ isFreePreview: event.target.checked })} type="checkbox" />
              درس مجاني للمعاينة
            </label>
          </div>
          <PersistentInstructorVideoUpload lessonId={lesson.id} lessonTitle={lesson.title} initialStatus={lesson.mediaStatus} onStatusChange={(mediaStatus) => replaceLesson({ ...lesson, mediaStatus })} />
        </div>
      </div>
      <div className={styles.rowActions}>
        {title.trim() !== lesson.title ? <button className={styles.textButton} disabled={isSaving} onClick={() => void saveLesson({ title: title.trim() })} type="button">حفظ الاسم</button> : null}
        <button className={styles.textButton} disabled={!canMoveUp || isOrdering || isSaving} onClick={() => onMove(-1)} type="button">نقل لأعلى</button>
        <button className={styles.textButton} disabled={!canMoveDown || isOrdering || isSaving} onClick={() => onMove(1)} type="button">نقل لأسفل</button>
        {!confirmingDelete ? <button className={styles.dangerTextButton} disabled={isSaving} onClick={() => setConfirmingDelete(true)} type="button">حذف الدرس</button> : null}
      </div>
      {confirmingDelete ? (
        <div className={styles.inlineConfirmation} role="group" aria-label={`تأكيد حذف ${lesson.title}`}>
          <p>سيُحذف هذا الدرس من المسودة. هل تريد المتابعة؟</p>
          <button className={styles.dangerButton} disabled={isSaving} onClick={() => void deleteLesson()} type="button">تأكيد الحذف</button>
          <button className={styles.quietButton} disabled={isSaving} onClick={() => setConfirmingDelete(false)} type="button">إلغاء</button>
        </div>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </article>
  );
}
