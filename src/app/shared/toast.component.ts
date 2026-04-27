import { Component, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';
import { SvgIconComponent } from './svg-icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [SvgIconComponent],
  template: `
    <div class="toast-container">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast-' + t.type + (t.hiding ? ' hiding' : '')">
          @if (t.type === 'success') {
            <div class="w-8 h-8 rounded-full bg-emerald/15 flex items-center justify-center shrink-0">
              <app-svg-icon name="check" [size]="16" iconClass="text-emerald" />
            </div>
          } @else if (t.type === 'error') {
            <div class="w-8 h-8 rounded-full bg-error/12 flex items-center justify-center shrink-0">
              <app-svg-icon name="x-mark" [size]="16" iconClass="text-error" />
            </div>
          } @else if (t.type === 'warning') {
            <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <app-svg-icon name="exclamation-triangle" [size]="16" iconClass="text-amber-600" />
            </div>
          } @else {
            <div class="w-8 h-8 rounded-full bg-brick/10 flex items-center justify-center shrink-0">
              <app-svg-icon name="information-circle" [size]="16" iconClass="text-brick" />
            </div>
          }
          <p class="text-sm text-navy font-semibold leading-snug flex-1">{{ t.message }}</p>
          <button (click)="toast.remove(t.id)" class="text-navy/30 hover:text-navy/60 transition-colors shrink-0 -mt-0.5">
            <app-svg-icon name="x-mark" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
