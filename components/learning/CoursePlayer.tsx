"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  apiErrorResponseSchema,
  lessonPlaybackResponseSchema,
  lessonProgressResponseSchema,
  type CatalogueCourseDetail,
  type LessonPlaybackResponse,
} from "@/lib/contracts";
import { Duration } from "@/components/ui/Duration";
import { detachPlayerEventListeners, type PlayerEventListener } from "@/lib/video/player-events";

import styles from "./CoursePlayer.module.css";

type CourseLesson = CatalogueCourseDetail["modules"][number]["lessons"][number];
type LearningCourseDetail = CatalogueCourseDetail & { completedLessonIds: string[] };

type BunnyPlayer = {
  on: (event: string, callback: PlayerEventListener) => void;
  off?: (event: string, callback: PlayerEventListener) => void;
  setCurrentTime?: (seconds: number) => void;
};

declare global {
  interface Window {
    playerjs?: {
      Player: new (frame: HTMLIFrameElement) => BunnyPlayer;
    };
  }
}

const westernNumber = new Intl.NumberFormat("en-US");

function parseTimingData(payload: unknown) {
  let value = payload;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") return null;

  const timing = value as Record<string, unknown>;
  const seconds = timing.seconds ?? timing.currentTime;

  return typeof seconds === "number" && Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : null;
}

function playerErrorMessage(code: string | null) {
  switch (code) {
    case "playback_forbidden":
      return "هذا الدرس غير متاح لحسابك. ابدأ بالدرس المجاني أو سجّل في المادة للوصول إلى بقية الدروس.";
    case "video_not_ready":
      return "الفيديو غير جاهز للمشاهدة الآن. ارجع بعد قليل وحاول مرة ثانية.";
    case "unauthenticated":
      return "سجّل دخولك أولًا للوصول إلى هذا الدرس.";
    default:
      return "تعذر تجهيز الدرس للمشاهدة. حاول مرة ثانية.";
  }
}

function PlayerState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.state} role="status">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

function BunnyPlaybackFrame({
  lessonId,
  lessonTitle,
  playback,
  onProgressSaved,
  onConflict,
}: {
  lessonId: string;
  lessonTitle: string;
  playback: LessonPlaybackResponse["data"];
  onProgressSaved: (lessonId: string, completed: boolean) => void;
  onConflict: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const positionRef = useRef(playback.progress?.positionSeconds ?? 0);
  const lastPersistedPositionRef = useRef(playback.progress?.positionSeconds ?? 0);
  const revisionRef = useRef(playback.progress?.revision ?? 0);
  const isSavingRef = useRef(false);
  const [playerScriptReady, setPlayerScriptReady] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    playback.progress?.completedAt ? "مكتمل" : "",
  );

  const saveProgress = useCallback(
    async (markComplete = false, force = false) => {
      const positionSeconds = Math.max(0, Math.floor(positionRef.current));
      const hasMeaningfulChange =
        markComplete ||
        force ||
        positionSeconds - lastPersistedPositionRef.current >= 15;

      if (!hasMeaningfulChange || isSavingRef.current) return;

      isSavingRef.current = true;
      if (markComplete) setIsMarkingComplete(true);
      setSaveStatus("جارٍ حفظ التقدّم");

      try {
        const response = await fetch("/api/lessons/" + lessonId + "/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionSeconds,
            revision: revisionRef.current,
            markComplete,
          }),
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const apiError = apiErrorResponseSchema.safeParse(payload);

          if (apiError.success && apiError.data.error.code === "progress_conflict") {
            setSaveStatus("تم تحديث التقدّم من جلسة أخرى. جارٍ إعادة التحميل.");
            onConflict();
            return;
          }

          setSaveStatus("تعذر حفظ التقدّم.");
          return;
        }

        const saved = lessonProgressResponseSchema.safeParse(payload);

        if (!saved.success) {
          setSaveStatus("تعذر حفظ التقدّم.");
          return;
        }

        revisionRef.current = saved.data.data.revision;
        lastPersistedPositionRef.current = saved.data.data.positionSeconds;
        positionRef.current = saved.data.data.positionSeconds;

        const completed = saved.data.data.completedAt !== null;
        setSaveStatus(completed ? "مكتمل ومحفوظ" : "تم حفظ التقدّم");
        onProgressSaved(lessonId, completed);
      } catch {
        setSaveStatus("تعذر حفظ التقدّم.");
      } finally {
        isSavingRef.current = false;
        if (markComplete) setIsMarkingComplete(false);
      }
    },
    [lessonId, onConflict, onProgressSaved],
  );

  useEffect(() => {
    const saveOnExit = () => {
      const positionSeconds = Math.max(0, Math.floor(positionRef.current));

      if (
        positionSeconds <= lastPersistedPositionRef.current ||
        isSavingRef.current
      ) {
        return;
      }

      void fetch("/api/lessons/" + lessonId + "/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionSeconds,
          revision: revisionRef.current,
          markComplete: false,
        }),
        keepalive: true,
      });
    };

    window.addEventListener("pagehide", saveOnExit);
    return () => window.removeEventListener("pagehide", saveOnExit);
  }, [lessonId]);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame || !playerScriptReady || !window.playerjs) return;

    const player = new window.playerjs.Player(frame);
    const onReady = () => {
      if (positionRef.current > 0) {
        player.setCurrentTime?.(positionRef.current);
      }
    };
    const onTimeUpdate = (payload?: unknown) => {
      const position = parseTimingData(payload);

      if (position === null) return;

      positionRef.current = position;
      void saveProgress();
    };
    const onPause = () => void saveProgress(false, true);
    const onSeeked = () => void saveProgress(false, true);
    const onEnded = () => void saveProgress(true, true);

    player.on("ready", onReady);
    player.on("timeupdate", onTimeUpdate);
    player.on("pause", onPause);
    player.on("seeked", onSeeked);
    player.on("ended", onEnded);

    return () => {
      detachPlayerEventListeners(player, [
        ["ready", onReady],
        ["timeupdate", onTimeUpdate],
        ["pause", onPause],
        ["seeked", onSeeked],
        ["ended", onEnded],
      ]);
    };
  }, [playerScriptReady, playback.playbackUrl, saveProgress]);

  return (
    <>
      <Script
        src="https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js"
        strategy="afterInteractive"
        onError={() => setSaveStatus("تعذر تفعيل تتبّع التقدّم.")}
        onLoad={() => setPlayerScriptReady(true)}
      />
      <div className={styles.frameWrap}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.frame}
          ref={frameRef}
          referrerPolicy="strict-origin-when-cross-origin"
          src={playback.playbackUrl}
          title={"مشغّل الدرس: " + lessonTitle}
        />
      </div>
      <div className={styles.playerControls}>
        <button
          className={styles.complete}
          disabled={isMarkingComplete}
          onClick={() => void saveProgress(true, true)}
          type="button"
        >
          {isMarkingComplete ? "جارٍ الحفظ" : "تحديد الدرس كمكتمل"}
        </button>
        <span aria-live="polite" className={styles.saveStatus}>
          {saveStatus}
        </span>
      </div>
    </>
  );
}

function PlaybackPanel({
  lesson,
  onProgressSaved,
}: {
  lesson: CourseLesson;
  onProgressSaved: (lessonId: string, completed: boolean) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [playback, setPlayback] = useState<LessonPlaybackResponse["data"] | null>(null);
  const [state, setState] = useState<"loading" | "forbidden" | "not-ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlayback() {
      setState("loading");
      setPlayback(null);

      try {
        const response = await fetch("/api/lessons/" + lesson.id + "/playback", {
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const apiError = apiErrorResponseSchema.safeParse(payload);
          const code = apiError.success ? apiError.data.error.code : null;

          setState(code === "playback_forbidden" ? "forbidden" : code === "video_not_ready" ? "not-ready" : "error");
          return;
        }

        const parsed = lessonPlaybackResponseSchema.safeParse(payload);

        if (!parsed.success) {
          setState("error");
          return;
        }

        setPlayback(parsed.data.data);
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }

    void loadPlayback();
    return () => controller.abort();
  }, [attempt, lesson.id]);

  if (playback) {
    return (
      <BunnyPlaybackFrame
        key={lesson.id + "-" + attempt}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        onConflict={() => setAttempt((current) => current + 1)}
        onProgressSaved={onProgressSaved}
        playback={playback}
      />
    );
  }

  if (state === "loading") {
    return <PlayerState body="نجهّز الفيديو ونسترجع نقطة التوقّف المحفوظة." title="جارٍ فتح الدرس" />;
  }

  if (state === "forbidden") {
    return <PlayerState body={playerErrorMessage("playback_forbidden")} title="هذا الدرس مقفل" />;
  }

  if (state === "not-ready") {
    return (
      <PlayerState
        action={<button className={styles.retry} onClick={() => setAttempt((current) => current + 1)} type="button">إعادة المحاولة</button>}
        body={playerErrorMessage("video_not_ready")}
        title="الفيديو غير جاهز"
      />
    );
  }

  return (
    <PlayerState
      action={<button className={styles.retry} onClick={() => setAttempt((current) => current + 1)} type="button">إعادة المحاولة</button>}
      body={playerErrorMessage(null)}
      title="تعذر فتح الفيديو"
    />
  );
}

export function CoursePlayer({
  course,
  initialLessonId,
}: {
  course: LearningCourseDetail;
  initialLessonId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const lessons = course.modules.flatMap((module) => module.lessons);
  const defaultLesson =
    lessons.find((lesson) => lesson.id === initialLessonId) ??
    (course.isEnrolled
      ? lessons[0]
      : lessons.find((lesson) => lesson.isFreePreview)) ??
    null;
  const [selectedLessonId, setSelectedLessonId] = useState(defaultLesson?.id ?? null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    () => new Set(course.completedLessonIds),
  );
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const canAccessSelectedLesson = selectedLesson !== null && (course.isEnrolled || selectedLesson.isFreePreview);
  const completionPercentage = lessons.length === 0
    ? 0
    : Math.round((completedLessons.size / lessons.length) * 100);

  const selectLesson = (lesson: CourseLesson) => {
    setSelectedLessonId(lesson.id);
    router.replace(pathname + "?lesson=" + lesson.id, { scroll: false });
  };

  const onProgressSaved = useCallback((lessonId: string, completed: boolean) => {
    if (!completed) return;

    setCompletedLessons((current) => {
      const next = new Set(current);
      next.add(lessonId);
      return next;
    });
  }, []);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="مسار التنقل">
        <Link href="/dashboard">لوحة التعلّم</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
      </nav>
      <header className={styles.heading}>
        <div className={styles.headingContent}>
          <div>
        <h1>{course.title}</h1>
        <p>
          {course.isEnrolled
            ? "اختر درسًا، وستُحفظ نقطة التوقّف تلقائيًا أثناء المشاهدة."
            : "ابدأ بالدرس المجاني. بقية الدروس تصبح متاحة بعد التسجيل في المادة."}
        </p>
          </div>
          <span className={styles.courseCount}>
            <bdi dir="ltr">{westernNumber.format(lessons.length)}</bdi>
            <span>دروس</span>
          </span>
        </div>
        <div className={styles.courseProgress}>
          <span>تقدّمك في المادة</span>
          <progress aria-label="تقدّمك في المادة" max={100} value={completionPercentage} />
          <bdi dir="ltr">{westernNumber.format(completionPercentage)}%</bdi>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.playerColumn} aria-labelledby="lesson-heading">
          {selectedLesson ? (
            <>
              <header className={styles.lessonHeader}>
                <h2 id="lesson-heading">{selectedLesson.title}</h2>
                <p className={styles.lessonMeta}>
                  {selectedLesson.durationSeconds === null ? (
                    "المدة غير متاحة"
                  ) : (
                    <Duration minutes={Math.ceil(selectedLesson.durationSeconds / 60)} />
                  )}
                </p>
              </header>
              {canAccessSelectedLesson ? (
                <PlaybackPanel key={selectedLesson.id} lesson={selectedLesson} onProgressSaved={onProgressSaved} />
              ) : (
                <PlayerState
                  action={<Link className={styles.catalogueLink} href={"/courses/" + course.slug}>عرض المادة</Link>}
                  body="هذا الدرس يحتاج التسجيل في المادة. يمكنك مشاهدة الدرس المجاني المتاح في القائمة."
                  title="هذا الدرس مقفل"
                />
              )}
            </>
          ) : (
            <PlayerState
              body="لا توجد دروس متاحة للمشاهدة في هذه المادة حاليًا."
              title="لا يوجد درس متاح"
            />
          )}
        </section>

        <aside className={styles.curriculum} aria-label="قائمة الدروس">
          <header className={styles.curriculumHeader}>
            <h2>محتوى المادة</h2>
            <p>
              <bdi dir="ltr">{westernNumber.format(lessons.length)}</bdi> دروس
            </p>
          </header>

          {course.modules.map((module, moduleIndex) => (
            <details className={styles.module} key={module.id} open={moduleIndex === 0}>
              <summary className={styles.moduleSummary}>{module.title}</summary>
              <div className={styles.lessonList}>
                {module.lessons.map((lesson) => {
                  const isAllowed = course.isEnrolled || lesson.isFreePreview;
                  const isActive = selectedLessonId === lesson.id;
                  const isCompleted = completedLessons.has(lesson.id);

                  return (
                    <button
                      aria-current={isActive ? "step" : undefined}
                      aria-label={lesson.title + (isAllowed ? "" : " — يحتاج إلى التسجيل")}
                      className={[
                        styles.lesson,
                        isActive ? styles.lessonActive : "",
                        !isAllowed ? styles.lessonLocked : "",
                      ].filter(Boolean).join(" ")}
                      key={lesson.id}
                      onClick={() => selectLesson(lesson)}
                      type="button"
                    >
                      <span className={styles.lessonTitle}>{lesson.title}</span>
                      <span className={styles.lessonEnd}>
                        {isCompleted ? <span className={styles.done}>مكتمل</span> : null}
                        {lesson.isFreePreview ? <span className={styles.free}>مجاني</span> : null}
                        {!isAllowed ? <span className={styles.locked}>مقفل</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          ))}

          {!course.isEnrolled ? (
            <p className={styles.notice}>
              الدرس المجاني متاح للتجربة. حفظ التقدّم فيه مرتبط بحسابك.
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
