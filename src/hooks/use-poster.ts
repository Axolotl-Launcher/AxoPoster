"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTemplate, type PosterDocument } from "@/lib/poster";
import { readAutosave, writeAutosave } from "@/lib/storage";

type SaveStatus = "loading" | "saving" | "saved" | "error";
type History = { past: PosterDocument[]; present: PosterDocument; future: PosterDocument[] };

export function usePoster() {
  const [history, setHistory] = useState<History>(() => ({
    past: [], present: createTemplate(), future: [],
  }));
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [storageError, setStorageError] = useState("");
  const current = useRef(history.present);
  const revision = useRef(0);
  const savedRevision = useRef(-1);
  const lastEdit = useRef({ group: "", time: 0 });
  const loaded = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const stored = await readAutosave();
        if (!active) return;
        if (stored) {
          current.current = stored;
          setHistory({ past: [], present: stored, future: [] });
        }
        savedRevision.current = revision.current;
        setSaveStatus("saved");
      } catch {
        if (!active) return;
        setStorageError("无法读取本地草稿。当前内容仍可编辑，请导出 JSON 备份。");
        setSaveStatus("error");
      }
      if (active) {
        loaded.current = true;
        setReady(true);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const persist = useCallback(async () => {
    if (!loaded.current) return;
    const savingRevision = revision.current;
    setSaveStatus("saving");
    try {
      await writeAutosave(current.current);
      savedRevision.current = savingRevision;
      if (revision.current === savingRevision) {
        setSaveStatus("saved");
        setStorageError("");
      }
    } catch {
      setSaveStatus("error");
      setStorageError("本地保存失败，可能是存储空间不足或浏览器限制。内容尚未丢失，请重试或导出 JSON。");
    }
  }, []);

  useEffect(() => {
    if (!ready || revision.current === savedRevision.current) return;
    const timer = window.setTimeout(() => void persist(), 450);
    return () => window.clearTimeout(timer);
  }, [history.present, ready, persist]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden" && revision.current !== savedRevision.current) void persist();
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (revision.current !== savedRevision.current) {
        event.preventDefault();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [persist]);

  const update = useCallback((
    change: PosterDocument | ((document: PosterDocument) => PosterDocument),
    group = "",
  ) => {
    if (!loaded.current) return;
    const next = typeof change === "function" ? change(current.current) : change;
    if (next === current.current) return;
    const now = Date.now();
    const grouped = Boolean(group) && lastEdit.current.group === group && now - lastEdit.current.time < 700;
    lastEdit.current = { group, time: now };
    current.current = next;
    revision.current++;
    setSaveStatus("saving");
    setHistory((previous) => ({
      past: grouped ? previous.past : [...previous.past, previous.present].slice(-50),
      present: next,
      future: [],
    }));
  }, []);

  const travel = useCallback((direction: "undo" | "redo") => {
    setHistory((previous) => {
      const next = direction === "undo" ? previous.past.at(-1) : previous.future[0];
      if (!next) return previous;
      return direction === "undo"
        ? { past: previous.past.slice(0, -1), present: next, future: [previous.present, ...previous.future] }
        : { past: [...previous.past, previous.present], present: next, future: previous.future.slice(1) };
    });
    lastEdit.current = { group: "", time: 0 };
  }, []);

  // Undo/redo restores a history snapshot, which must also become the persisted value.
  useEffect(() => {
    if (current.current === history.present) return;
    current.current = history.present;
    revision.current++;
    const timer = window.setTimeout(() => void persist(), 0);
    return () => window.clearTimeout(timer);
  }, [history.present, persist]);

  return {
    document: history.present,
    ready,
    saveStatus,
    storageError,
    update,
    persist,
    undo: () => travel("undo"),
    redo: () => travel("redo"),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
