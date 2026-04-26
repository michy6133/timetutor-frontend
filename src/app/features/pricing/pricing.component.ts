import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface Plan {
  code: string;
  name: string;
  price: number;
  annualPrice: number;
  description: string;
  features: string[];
  popular: boolean;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
})
export class PricingComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly isAnnual = signal(false);
  readonly loadingPlan = signal<string | null>(null);

  readonly plans: Plan[] = [
    {
      code: 'standard',
      name: 'Standard',
      price: 0,
      annualPrice: 0,
      description: 'Parfait pour démarrer et explorer TimeTutor.',
      features: ['2 sessions actives', '15 enseignants/session', 'Grille de créneaux', 'Export PDF'],
      popular: false,
    },
    {
      code: 'ecole',
      name: 'École',
      price: 9900,
      annualPrice: 9900 * 10,
      description: 'Idéal pour les établissements scolaires.',
      features: ['Sessions illimitées', '50 enseignants/session', 'Toutes fonctionnalités', 'Support prioritaire', 'Export avancé'],
      popular: true,
    },
    {
      code: 'etablissement',
      name: 'Établissement',
      price: 19900,
      annualPrice: 19900 * 10,
      description: 'Pour les grands établissements multi-niveaux.',
      features: ['Sessions illimitées', 'Enseignants illimités', 'Multi-niveaux', 'API accès', 'Support dédié', 'SLA garanti'],
      popular: false,
    },
  ];

  selectPlan(plan: Plan): void {
    if (plan.code === 'standard') {
      this.toast.info('Le plan Standard est gratuit — vous en bénéficiez déjà à l\'inscription.');
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Connectez-vous pour souscrire à un plan.');
      return;
    }
    this.loadingPlan.set(plan.code);
    this.api.post<{ url: string; id: string | number }>('/billing/checkout/initiate', {
      planCode: plan.code,
      isAnnual: this.isAnnual(),
    }).subscribe({
      next: (res) => {
        this.loadingPlan.set(null);
        if (res.url) {
          window.location.href = res.url;
        }
      },
      error: (e) => {
        this.loadingPlan.set(null);
        this.toast.error(e.error?.error ?? 'Impossible d\'initier le paiement.');
      },
    });
  }

  formatPrice(amount: number): string {
    if (amount === 0) return 'Gratuit';
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }
}
