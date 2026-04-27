import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly platformId = inject(PLATFORM_ID);

  private canUse(): boolean {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }

  /** Returns true on SSR (prevents hydration flicker — onboarding only runs in browser). */
  isDone(context: string): boolean {
    if (!this.canUse()) return true;
    return !!localStorage.getItem(`tt_onboarding_${context}`);
  }

  markDone(context: string): void {
    if (!this.canUse()) return;
    localStorage.setItem(`tt_onboarding_${context}`, '1');
  }
}
