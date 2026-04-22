import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, SvgIconComponent],
  template: `
    <div class="min-h-screen bg-gray-50 py-12 px-4">
      <div class="max-w-2xl mx-auto">
        <button (click)="goBack()" class="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          &larr; Retour
        </button>

        <div class="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div class="p-8 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white">
            <h1 class="text-3xl font-extrabold text-gray-900 mb-2">Finaliser votre abonnement</h1>
            <p class="text-gray-500">Vous y êtes presque ! Confirmez votre plan pour commencer.</p>
          </div>

          <div class="p-8">
            <div class="flex items-center justify-between p-6 bg-blue-50 rounded-2xl mb-8 border border-blue-100">
              <div>
                <p class="text-sm text-blue-600 font-bold uppercase tracking-wider mb-1">Plan sélectionné</p>
                <h2 class="text-2xl font-bold text-gray-900 capitalize">{{ plan() }} {{ isAnnual() ? '(Annuel)' : '(Mensuel)' }}</h2>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">Total à payer</p>
                <p class="text-2xl font-black text-gray-900">{{ price() }} FCFA</p>
              </div>
            </div>

            @if (error()) {
              <div class="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-6">{{ error() }}</div>
            }

            <!-- Simulation de paiement -->
            <div class="space-y-6">
              <h3 class="font-bold text-gray-900 flex items-center gap-2">
                <app-svg-icon name="credit-card" [size]="20" iconClass="text-gray-400" />
                Moyen de paiement
              </h3>
              
              <div class="grid grid-cols-2 gap-4">
                <button class="border-2 border-blue-600 bg-blue-50 rounded-xl p-4 flex flex-col items-center gap-2 relative">
                  <div class="absolute top-2 right-2 text-blue-600">
                    <app-svg-icon name="check" [size]="16" />
                  </div>
                  <div class="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">MM</div>
                  <span class="font-semibold text-sm">Mobile Money</span>
                </button>
                <button class="border border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col items-center gap-2 text-gray-500 opacity-50 cursor-not-allowed">
                  <div class="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold">CB</div>
                  <span class="font-semibold text-sm">Carte Bancaire (Bientôt)</span>
                </button>
              </div>

              <div class="pt-6">
                <button (click)="confirm()" [disabled]="loading()"
                  class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                  @if (loading()) {
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement en cours...
                  } @else {
                    Confirmer et Payer {{ price() }} FCFA
                  }
                </button>
                <p class="text-center text-xs text-gray-400 mt-4">Paiement sécurisé. Annulation possible à tout moment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CheckoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  readonly plan = signal('free');
  readonly isAnnual = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.plan.set(params['plan'] || 'free');
      this.isAnnual.set(params['annual'] === 'true');
    });
  }

  price(): string {
    let base = 0;
    if (this.plan() === 'ecole') base = 9900;
    if (this.plan() === 'etablissement') base = 19900;
    if (this.isAnnual()) base = base * 10;
    return base.toLocaleString('fr-FR');
  }

  goBack() {
    this.router.navigate(['/']);
  }

  confirm() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    const planCode = this.plan() === 'free' ? 'standard' : this.plan();

    this.api.post('/admin/me/checkout', {
      planCode,
      isAnnual: this.isAnnual()
    }).subscribe({
      next: () => {
        // Rediriger vers le dashboard (facturation) avec un message de succès
        this.router.navigate(['/director/billing']);
      },
      error: (e) => {
        this.error.set(e.error?.error || 'Erreur lors du paiement');
        this.loading.set(false);
      }
    });
  }
}
