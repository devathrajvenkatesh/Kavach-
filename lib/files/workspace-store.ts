/**
 * Kavach - Authoritative Workspace Files & Executive Triage State Store
 *
 * Provides a unified, single source of truth for all files inspected within
 * the Secure File Workspace and consumed across Executive Radar (CommandCenter)
 * and the AI Agent.
 *
 * Implements real-time cross-component synchronization via browser custom events
 * and localStorage persistence.
 */

import { WorkspaceFile } from "@/types/file-workspace";

export const WORKSPACE_FILES_STORAGE_KEY = "kavach_secure_workspace_files_v1";
const WORKSPACE_FILES_UPDATE_EVENT = "kavach_workspace_files_updated";

/**
 * Retrieve current workspace files from storage safely (SSR-compatible).
 */
export function getStoredWorkspaceFiles(): WorkspaceFile[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(WORKSPACE_FILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[WorkspaceStore] Failed to read stored workspace files:", err);
    return [];
  }
}

/**
 * Persist updated files and broadcast event to all listening components.
 */
export function saveStoredWorkspaceFiles(files: WorkspaceFile[]): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(WORKSPACE_FILES_STORAGE_KEY, JSON.stringify(files));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_FILES_UPDATE_EVENT, { detail: files })
    );
  } catch (err) {
    console.warn("[WorkspaceStore] Failed to persist workspace files:", err);
  }
}

/**
 * Subscribe to workspace file changes across components and browser tabs.
 */
export function subscribeToWorkspaceFiles(
  callback: (files: WorkspaceFile[]) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<WorkspaceFile[]>;
    if (Array.isArray(customEvt.detail)) {
      callback(customEvt.detail);
    } else {
      callback(getStoredWorkspaceFiles());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === WORKSPACE_FILES_STORAGE_KEY) {
      callback(getStoredWorkspaceFiles());
    }
  };

  window.addEventListener(WORKSPACE_FILES_UPDATE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(WORKSPACE_FILES_UPDATE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
