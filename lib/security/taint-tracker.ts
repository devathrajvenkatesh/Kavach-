/**
 * Possessed Butler - Taint Tracker
 *
 * Tracks taint flags across tool execution steps to ensure external content
 * never implicitly gains authority when passed as parameters to other tools.
 */

import { TrustContext } from "@/types";

export class TaintTracker {
  private activeTaintTags: Set<string> = new Set();

  registerTaint(tags: string[]): void {
    for (const tag of tags) {
      this.activeTaintTags.add(tag);
    }
  }

  isTainted(context: TrustContext): boolean {
    if (context.taintFlags && context.taintFlags.length > 0) {
      return true;
    }
    return false;
  }

  checkParametersForTaint(parameters: Record<string, unknown>): boolean {
    const rawString = JSON.stringify(parameters);
    for (const tag of this.activeTaintTags) {
      if (rawString.includes(tag)) {
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.activeTaintTags.clear();
  }
}

export const defaultTaintTracker = new TaintTracker();
