import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface OnboardingStep {
  text: string;
}

@Component({
  selector: 'app-onboarding-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-full px-4">
      <div class="bg-brick text-white rounded-2xl shadow-xl p-5 slide-up">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-sm font-bold">
            {{ currentStep() + 1 }}
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium leading-relaxed">{{ steps[currentStep()].text }}</p>
            <div class="flex items-center gap-2 mt-3">
              <div class="flex gap-1 flex-1">
                @for (s of steps; track $index) {
                  <div class="h-1.5 rounded-full flex-1 transition-colors"
                    [class]="$index <= currentStep() ? 'bg-white' : 'bg-white/30'"></div>
                }
              </div>
              <button type="button" (click)="nextStep()"
                class="px-4 py-1.5 bg-white text-brick text-xs font-bold rounded-lg hover:bg-white/90 transition-colors shrink-0">
                {{ currentStep() < steps.length - 1 ? 'Suivant' : 'Terminer' }}
              </button>
            </div>
          </div>
          <button type="button" (click)="dismiss.emit()" class="text-white/60 hover:text-white ml-1 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class OnboardingTooltipComponent {
  @Input() steps: OnboardingStep[] = [];
  @Output() dismiss = new EventEmitter<void>();

  readonly currentStep = signal(0);

  nextStep(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.set(this.currentStep() + 1);
    } else {
      this.dismiss.emit();
    }
  }
}
