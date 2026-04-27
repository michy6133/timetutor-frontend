import {
  Component, Input, Output, EventEmitter,
  signal, computed, AfterViewInit, OnDestroy,
  inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface OnboardingStep {
  /** CSS selector for the target element to highlight. */
  selector: string;
  title: string;
  text: string;
  /** Where to place the tooltip relative to the target. Default: 'bottom'. */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [],
  template: `
    @if (visible() && hasRect()) {

      <!-- Spotlight ring — huge box-shadow creates the dimmed overlay with a cutout -->
      <div class="fixed pointer-events-none"
           [style.top.px]="sTop()"
           [style.left.px]="sLeft()"
           [style.width.px]="sWidth()"
           [style.height.px]="sHeight()"
           style="z-index:9997;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,0.52);transition:top .25s,left .25s,width .25s,height .25s;">
      </div>

      <!-- Tooltip bubble -->
      <div class="fixed w-72 bg-white rounded-2xl border border-steel/40 p-5 fade-in"
           [style.top.px]="tTop()"
           [style.left.px]="tLeft()"
           style="z-index:9999;box-shadow:0 8px 32px rgba(0,20,39,.18);">

        <!-- Arrow pointing toward target -->
        @switch (step().position ?? 'bottom') {
          @case ('bottom') {
            <div class="absolute pointer-events-none" style="top:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid white;"></div>
          }
          @case ('top') {
            <div class="absolute pointer-events-none" style="bottom:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid white;"></div>
          }
          @case ('right') {
            <div class="absolute pointer-events-none" style="left:-8px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-right:8px solid white;"></div>
          }
          @case ('left') {
            <div class="absolute pointer-events-none" style="right:-8px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-left:8px solid white;"></div>
          }
        }

        <!-- Progress bar -->
        <div class="flex gap-1 mb-3">
          @for (s of steps; track $index) {
            <div class="flex-1 h-1 rounded-full transition-all duration-200"
                 [class]="$index <= currentStep() ? 'bg-brick' : 'bg-steel/40'"></div>
          }
        </div>

        <!-- Content -->
        <p class="text-[11px] font-bold text-brick/70 uppercase tracking-widest mb-0.5">
          Étape {{ currentStep() + 1 }}/{{ steps.length }}
        </p>
        <p class="text-sm font-bold text-navy mb-1 font-display">{{ step().title }}</p>
        <p class="text-sm text-navy/60 leading-relaxed">{{ step().text }}</p>

        <!-- Footer -->
        <div class="flex items-center justify-between mt-4 pt-3 border-t border-cream/50">
          <button type="button" (click)="skip()"
            class="text-xs text-navy/35 hover:text-navy/60 transition-colors">
            Passer
          </button>
          <div class="flex items-center gap-2">
            @if (currentStep() > 0) {
              <button type="button" (click)="prev()"
                class="text-xs text-navy/55 border border-cream/70 hover:border-navy/20 px-3 py-1.5 rounded-lg transition-all">
                ←
              </button>
            }
            <button type="button" (click)="next()"
              class="text-xs font-bold bg-brick text-white hover:bg-brick/85 px-4 py-1.5 rounded-lg transition-all">
              {{ currentStep() < steps.length - 1 ? 'Suivant →' : 'Terminer ✓' }}
            </button>
          </div>
        </div>

      </div>
    }
  `,
})
export class OnboardingOverlayComponent implements AfterViewInit, OnDestroy {
  @Input() steps: OnboardingStep[] = [];
  @Output() dismiss = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);

  readonly visible = signal(false);
  readonly currentStep = signal(0);
  private readonly _rect = signal<DOMRect | null>(null);

  private static readonly PAD = 6;
  private static readonly TW = 288;   // w-72
  private static readonly TH = 210;   // approx tooltip height
  private static readonly GAP = 14;

  readonly step = computed(() => this.steps[this.currentStep()] ?? this.steps[0]);
  readonly hasRect = computed(() => this._rect() !== null);

  // Spotlight position/size
  readonly sTop    = computed(() => (this._rect()?.top    ?? 0) - OnboardingOverlayComponent.PAD);
  readonly sLeft   = computed(() => (this._rect()?.left   ?? 0) - OnboardingOverlayComponent.PAD);
  readonly sWidth  = computed(() => (this._rect()?.width  ?? 0) + OnboardingOverlayComponent.PAD * 2);
  readonly sHeight = computed(() => (this._rect()?.height ?? 0) + OnboardingOverlayComponent.PAD * 2);

  // Tooltip position
  readonly tTop = computed((): number => {
    const r = this._rect();
    if (!r) return 0;
    const { PAD, TH, GAP } = OnboardingOverlayComponent;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const pos = this.step().position ?? 'bottom';
    let top: number;
    switch (pos) {
      case 'bottom': top = r.bottom + PAD + GAP; break;
      case 'top':    top = r.top - PAD - GAP - TH; break;
      case 'right':  top = r.top + r.height / 2 - TH / 2; break;
      case 'left':   top = r.top + r.height / 2 - TH / 2; break;
      default:       top = r.bottom + PAD + GAP;
    }
    return Math.max(12, Math.min(top, vh - TH - 12));
  });

  readonly tLeft = computed((): number => {
    const r = this._rect();
    if (!r) return 0;
    const { PAD, TW, GAP } = OnboardingOverlayComponent;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const pos = this.step().position ?? 'bottom';
    let left: number;
    switch (pos) {
      case 'bottom': left = r.left + r.width / 2 - TW / 2; break;
      case 'top':    left = r.left + r.width / 2 - TW / 2; break;
      case 'right':  left = r.right + PAD + GAP; break;
      case 'left':   left = r.left - PAD - GAP - TW; break;
      default:       left = r.left + r.width / 2 - TW / 2;
    }
    return Math.max(12, Math.min(left, vw - TW - 12));
  });

  private resizeHandler?: () => void;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.resizeHandler = () => this.measureRect();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    // First render after a rAF to let Angular finish rendering and layout settle
    requestAnimationFrame(() => {
      this.measureRect();
      this.visible.set(true);
    });
  }

  ngOnDestroy(): void {
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
  }

  private measureRect(): void {
    const step = this.steps[this.currentStep()];
    if (!step?.selector) return;
    const el = document.querySelector(step.selector);
    if (!el) return;

    // Scroll element into view, then measure after layout
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => {
      const r = (el as Element).getBoundingClientRect();
      this._rect.set(r);
    }, 320);
  }

  next(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this._rect.set(null); // clear so we don't show stale spotlight
      this.currentStep.update(s => s + 1);
      requestAnimationFrame(() => this.measureRect());
    } else {
      this.dismiss.emit();
    }
  }

  prev(): void {
    if (this.currentStep() > 0) {
      this._rect.set(null);
      this.currentStep.update(s => s - 1);
      requestAnimationFrame(() => this.measureRect());
    }
  }

  skip(): void {
    this.dismiss.emit();
  }
}
