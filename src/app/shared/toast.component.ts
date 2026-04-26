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
            <app-svg-icon name="check" [size]="18" iconClass="text-amber-600 shrink-0 mt-0.5" />
          } @else if (t.type === 'error') {
            <app-svg-icon name="x-mark" [size]="18" iconClass="text-mahogany shrink-0 mt-0.5" />
          } @else if (t.type === 'warning') {
            <app-svg-icon name="exclamation-triangle" [size]="18" iconClass="text-gold shrink-0 mt-0.5" />
          } @else {
            <app-svg-icon name="information-circle" [size]="18" iconClass="text-brick shrink-0 mt-0.5" />
          }
          <p class="text-sm text-navy/80 font-medium leading-snug flex-1">{{ t.message }}</p>
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
