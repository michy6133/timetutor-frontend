import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

export interface PaymentTxRow {
  id: number;
  transaction_id: string;
  plan_code: string;
  amount: number;
  is_annual: boolean;
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, SvgIconComponent],
  templateUrl: './billing.component.html',
})
export class BillingComponent {
  private readonly api = inject(ApiService);
  readonly subscription = signal<any | null>(null);
  readonly transactions = signal<PaymentTxRow[]>([]);
  readonly error = signal<string>('');

  constructor() {
    this.api.get<any>('/admin/me/subscription').subscribe({
      next: (sub) => this.subscription.set(sub),
      error: () => {
        this.error.set('Aucun abonnement actif trouvé. Veuillez contacter le support.');
        this.subscription.set({ plan_code: 'Aucun', status: 'Inconnu' });
      },
    });
    this.api.get<PaymentTxRow[]>('/billing/transactions').subscribe({
      next: (rows) => this.transactions.set(rows),
      error: () => this.transactions.set([]),
    });
  }

  sessionsUsagePct(): number {
    const sub = this.subscription() as { usage?: { sessionsCount?: number; sessionsLimit?: number | null } } | null;
    const u = sub?.usage;
    if (!u?.sessionsLimit || u.sessionsLimit <= 0) return 0;
    return Math.min(100, Math.round((100 * (u.sessionsCount ?? 0)) / u.sessionsLimit));
  }

  teachersUsagePct(): number {
    const sub = this.subscription() as {
      usage?: { maxTeachersInSession?: number; teachersPerSessionLimit?: number | null };
    } | null;
    const u = sub?.usage;
    if (!u?.teachersPerSessionLimit || u.teachersPerSessionLimit <= 0) return 0;
    return Math.min(100, Math.round((100 * (u.maxTeachersInSession ?? 0)) / u.teachersPerSessionLimit));
  }

  formatAmountFcfa(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }
}
