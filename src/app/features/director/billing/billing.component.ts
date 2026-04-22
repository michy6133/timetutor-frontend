import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, SvgIconComponent],
  templateUrl: './billing.component.html',
})
export class BillingComponent {
  private readonly api = inject(ApiService);
  readonly subscription = signal<any | null>(null);
  readonly error = signal<string>('');

  constructor() {
    this.api.get('/admin/me/subscription').subscribe({
      next: (sub) => this.subscription.set(sub),
      error: () => {
        this.error.set('Aucun abonnement actif trouvé. Veuillez contacter le support.');
        this.subscription.set({ plan_code: 'Aucun', status: 'Inconnu' });
      }
    });
  }
}
