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
      50% { transform: translateY(-18px); }
    }
    @keyframes float2 {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-25px) scale(1.03); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(32px); }
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
    .orb1 { animation: pulse-glow 7s ease-in-out infinite; }
    .orb2 { animation: pulse-glow 9s ease-in-out infinite 2s; }
    .orb3 { animation: float2 10s ease-in-out infinite 1s; }
    .float-card { animation: float 6s ease-in-out infinite; }
    .float-card2 { animation: float2 8s ease-in-out infinite 1.5s; }
    .slide-up { animation: slide-up 0.7s ease both; }
    .marquee { animation: marquee 28s linear infinite; }
    .gradient-text {
      background: linear-gradient(135deg, #60a5fa, #818cf8, #a78bfa);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradient-x 4s ease infinite;
    }
    .hero-bg {
      background: radial-gradient(ellipse at 70% 50%, rgba(203, 238, 243, 0.35) 0%, transparent 60%),
                  radial-gradient(ellipse at 20% 80%, rgba(244, 156, 187, 0.2) 0%, transparent 50%),
                  #ffffff;
    }
    .card-hover {
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .card-hover:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.12);
    }
    .pricing-popular {
      background: linear-gradient(145deg, rgba(221,45,74,.07) 0%, #ffffff 100%);
      border: 2px solid rgba(221,45,74,.3);
    }
  `],
})
export class LandingComponent {
  readonly auth = inject(AuthService);
  annual = signal(false);

  dashboardLink(): string {
    return this.auth.currentUser()?.role === 'teacher' ? '/teacher/portal' : '/director/dashboard';
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
