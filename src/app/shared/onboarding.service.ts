import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly key = 'tt_onboarding_done';

  isDone(): boolean {
    return !!localStorage.getItem(this.key);
  }

  markDone(): void {
    localStorage.setItem(this.key, '1');
  }
}
