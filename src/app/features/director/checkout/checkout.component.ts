import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

declare const FedaPay: any;

const PLANS: Record<string, { label: string; monthly: number }> = {
  ecole:         { label: 'Plan École',        monthly: 9900  },
  etablissement: { label: 'Plan Établissement', monthly: 19900 },
  free:          { label: 'Plan Gratuit',       monthly: 0     },
};

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, SvgIconComponent],
  template: `
    <div class="min-h-screen py-12 px-4" style="background:#EEE6D8">
      <div class="max-w-2xl mx-auto">
        <a routerLink="/" class="inline-flex items-center gap-2 text-navy/50 hover:text-navy mb-8 transition-colors text-sm">
          <app-svg-icon name="arrow-left" [size]="16" iconClass="shrink-0" /> Retour
        </a>

        <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-cream/60">
          <div class="p-8 border-b border-cream/50 bg-gradient-to-br from-cream/30 to-white">
            <h1 class="font-display text-3xl font-extrabold text-navy mb-2">Finaliser votre abonnement</h1>
            <p class="text-navy/50">Vous y êtes presque ! Confirmez votre plan pour commencer.</p>
          </div>

          <div class="p-8">
            <!-- Plan summary -->
            <div class="flex items-center justify-between p-6 bg-molten/8 rounded-2xl mb-8 border border-molten/20">
              <div>
                <p class="text-xs text-amber-700 font-bold uppercase tracking-wider mb-1">Plan sélectionné</p>
                <h2 class="text-2xl font-display font-bold text-navy">{{ planLabel() }} {{ isAnnual() ? '(Annuel)' : '(Mensuel)' }}</h2>
              </div>
              <div class="text-right">
                <p class="text-xs text-navy/50">Total à payer</p>
                <p class="text-2xl font-black text-navy">{{ totalPrice() }} FCFA</p>
                @if (isAnnual() && totalRaw() > 0) {
                  <p class="text-xs text-brick mt-0.5">Économie de {{ saving() }} FCFA</p>
                }
              </div>
            </div>

            @if (plan() === 'free') {
              <div class="bg-cream/50 border border-cream/80 rounded-2xl p-6 mb-8 text-center">
                <app-svg-icon name="check" [size]="32" iconClass="text-brick mx-auto mb-3" />
                <p class="font-display font-bold text-navy mb-1">Plan gratuit</p>
                <p class="text-sm text-navy/50">Aucun paiement requis. Votre compte est actif.</p>
              </div>
              <button (click)="goToDashboard()" class="btn-brick w-full py-4 text-base">
                Accéder au tableau de bord →
              </button>
            } @else {
              @if (error()) {
                <div class="bg-mahogany/8 text-mahogany px-4 py-3 rounded-xl mb-6 flex items-start gap-2 text-sm">
                  <app-svg-icon name="exclamation-triangle" [size]="16" iconClass="shrink-0 mt-0.5" />
                  {{ error() }}
                </div>
              }

              <!-- Payment methods -->
              <div class="mb-6">
                <h3 class="font-display font-bold text-navy mb-4 flex items-center gap-2">
                  <app-svg-icon name="credit-card" [size]="18" iconClass="text-brick/60" />
                  Mode de paiement — FedaPay
                </h3>
                <div class="grid grid-cols-3 gap-3">
                  <div class="border-2 border-molten/40 bg-molten/8 rounded-xl p-4 flex flex-col items-center gap-2">
                    <div class="w-10 h-10 bg-yellow-400 text-white rounded-full flex items-center justify-center font-bold text-sm">MTN</div>
                    <span class="font-semibold text-xs text-navy">MTN MoMo</span>
                  </div>
                  <div class="border border-cream/80 bg-cream/30 rounded-xl p-4 flex flex-col items-center gap-2">
                    <div class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">MOV</div>
                    <span class="font-semibold text-xs text-navy">Moov Money</span>
                  </div>
                  <div class="border border-cream/80 bg-cream/30 rounded-xl p-4 flex flex-col items-center gap-2">
                    <div class="w-10 h-10 bg-slate-700 text-white rounded-full flex items-center justify-center font-bold text-xs">CB</div>
                    <span class="font-semibold text-xs text-navy">Carte</span>
                  </div>
                </div>
                <p class="text-xs text-navy/40 mt-2 text-center">FedaPay ouvre une fenêtre sécurisée pour finaliser le paiement</p>
              </div>

              <!-- Guarantee -->
              <div class="flex items-start gap-3 p-4 bg-cream/40 rounded-xl mb-6 text-sm text-navy/60">
                <app-svg-icon name="shield-check" [size]="18" iconClass="text-brick/60 shrink-0 mt-0.5" />
                <span>Paiement 100% sécurisé via FedaPay. Annulation possible à tout moment. Garantie satisfait ou remboursé 30 jours.</span>
              </div>

              <button (click)="pay()" [disabled]="loading()"
                class="btn-brick w-full py-4 text-base shadow-lg shadow-brick/20">
                @if (loading()) {
                  <span class="spinner"></span> Ouverture du paiement...
                } @else {
                  Payer {{ totalPrice() }} FCFA via FedaPay →
                }
              </button>
              <p class="text-center text-xs text-navy/35 mt-4">En confirmant, vous acceptez nos conditions d'utilisation.</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly plan = signal('free');
  readonly isAnnual = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      this.plan.set(p['plan'] || 'free');
      this.isAnnual.set(p['annual'] === 'true');
    });
  }

  planLabel(): string { return PLANS[this.plan()]?.label ?? this.plan(); }
  totalRaw(): number {
    const m = PLANS[this.plan()]?.monthly ?? 0;
    return this.isAnnual() ? m * 10 : m;
  }
  totalPrice(): string { return this.totalRaw().toLocaleString('fr-FR'); }
  saving(): string {
    const m = PLANS[this.plan()]?.monthly ?? 0;
    return (m * 2).toLocaleString('fr-FR');
  }

  goToDashboard(): void { this.router.navigate(['/director/dashboard']); }

  pay(): void {
    if (this.loading() || this.plan() === 'free') return;
    this.loading.set(true);
    this.error.set('');

    this.api.post<{ transactionId: string; publicKey: string; amount: number; description: string }>(
      '/billing/checkout/initiate',
      { planCode: this.plan(), isAnnual: this.isAnnual() }
    ).subscribe({
      next: (res) => {
        if (!isPlatformBrowser(this.platformId)) return;
        if (typeof FedaPay === 'undefined') {
          this.fallbackConfirm(res.transactionId);
          return;
        }
        FedaPay.init({
          public_key: res.publicKey,
          transaction: { id: res.transactionId },
          customer: {},
          onComplete: (resp: any) => {
            if (resp.reason === FedaPay.CHECKOUT_COMPLETED) {
              this.confirmPayment(res.transactionId);
            } else {
              this.loading.set(false);
              this.error.set('Paiement annulé ou échoué.');
            }
          },
        }).open();
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.error ?? 'Impossible d\'initier le paiement.');
      },
    });
  }

  private confirmPayment(transactionId: string): void {
    this.api.post('/billing/checkout/confirm', { transactionId, planCode: this.plan(), isAnnual: this.isAnnual() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Abonnement activé avec succès !');
        this.router.navigate(['/director/billing']);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.error ?? 'Erreur confirmation paiement.');
      },
    });
  }

  private fallbackConfirm(transactionId: string): void {
    this.api.post('/billing/checkout/confirm', { transactionId, planCode: this.plan(), isAnnual: this.isAnnual() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Abonnement activé !');
        this.router.navigate(['/director/billing']);
      },
      error: () => { this.loading.set(false); this.error.set('Erreur activation.'); },
    });
  }
}
