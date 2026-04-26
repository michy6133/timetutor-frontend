import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SvgIconComponent } from '../../shared/svg-icon.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, SvgIconComponent],
  templateUrl: './landing.component.html',
  styles: [`
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-14px); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.9; transform: scale(1.08); }
    }
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes marquee {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes gradient-x {
      0%, 100% { background-position: 0% 50%; }
      50%       { background-position: 100% 50%; }
    }
    .hero-orb1 { animation: pulse-glow 8s ease-in-out infinite; }
    .hero-orb2 { animation: pulse-glow 11s ease-in-out infinite 3s; }
    .cta-orb   { animation: pulse-glow 9s ease-in-out infinite; }
    .cta-orb2  { animation: pulse-glow 12s ease-in-out infinite 4s; }
    .product-glow { animation: pulse-glow 6s ease-in-out infinite 1s; }
    .slide-up { animation: slide-up 0.7s ease both; }
    .marquee { animation: marquee 30s linear infinite; display: flex; white-space: nowrap; }
    .hero-gradient-text {
      background: linear-gradient(135deg, #708D81 0%, #001427 45%, #F4D58D 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradient-x 5s ease infinite;
    }
    .hero-bg {
      background: #111827;
    }
    .cta-bg {
      background: #111827;
    }
    .hero-grid {
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 48px 48px;
    }
  `],
})
export class LandingComponent {
  readonly auth = inject(AuthService);
  annual = signal(false);

  readonly mockRows = [
    { label: '08h', cells: ['free','taken','ok','free','taken','free'] },
    { label: '10h', cells: ['ok','free','taken','ok','free','ok'] },
    { label: '12h', cells: ['taken','ok','free','warn','ok','free'] },
    { label: '14h', cells: ['free','ok','ok','taken','free','taken'] },
    { label: '16h', cells: ['ok','taken','free','ok','taken','free'] },
  ];

  readonly mockTeachers = [
    { name: 'Kofi Akesson', initials: 'KA', slots: 4, status: 'ok' },
    { name: 'Marie Gbédo', initials: 'MG', slots: 2, status: 'pending' },
    { name: 'Justin Houndjè', initials: 'JH', slots: 5, status: 'ok' },
  ];

  dashboardLink(): string {
    return this.auth.currentUser()?.role === 'teacher' ? '/teacher/dashboard' : '/director/dashboard';
  }

  getPricingLink(plan: string): { path: string, queryParams: any } {
    const isAnnual = this.annual();
    if (this.auth.isAuthenticated()) {
      return { path: '/director/checkout', queryParams: { plan, annual: isAnnual } };
    } else {
      return { path: '/register', queryParams: { returnUrl: `/director/checkout?plan=${plan}&annual=${isAnnual}` } };
    }
  }

  price(monthly: number): string {
    const v = this.annual() ? Math.round(monthly * 10) : monthly;
    return v.toLocaleString('fr-FR');
  }

  unit(): string { return this.annual() ? '/an' : '/mois'; }

  saving(monthly: number): string {
    if (!this.annual()) return '';
    const saved = monthly * 12 - monthly * 10;
    return `économisez ${saved.toLocaleString('fr-FR')} FCFA`;
  }
}
