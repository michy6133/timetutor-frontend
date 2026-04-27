import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly key = 'tt_onboarding_done';
  private readonly platformId = inject(PLATFORM_ID);

  private get canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }

  isDone(): boolean {
    if (!this.canUseStorage) return false;
    return !!localStorage.getItem(this.key);
  }

  markDone(): void {
    if (!this.canUseStorage) return;
    localStorage.setItem(this.key, '1');
  }
}
