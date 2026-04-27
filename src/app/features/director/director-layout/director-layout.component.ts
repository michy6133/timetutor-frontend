import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { OnboardingService } from '../../../shared/onboarding.service';
import { OnboardingOverlayComponent, type OnboardingStep } from '../../../shared/onboarding-overlay.component';

@Component({
  selector: 'app-director-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SvgIconComponent, OnboardingOverlayComponent],
  templateUrl: './director-layout.component.html',
})
export class DirectorLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly sub = inject(SubscriptionService);
  private readonly onboarding = inject(OnboardingService);
  readonly mobileMenuOpen = signal(false);
  readonly showOnboarding = signal(false);

  readonly onboardingSteps: OnboardingStep[] = [
    {
      selector: '[data-tour="dir-dashboard"]',
      title: 'Tableau de bord',
      text: 'Accédez à une vue d\'ensemble de vos sessions, créneaux validés et statistiques d\'utilisation.',
      position: 'right',
    },
    {
      selector: '[data-tour="dir-new-session"]',
      title: 'Créer une session',
      text: 'Démarrez ici : créez une session, configurez la grille horaire et invitez vos enseignants en quelques clics.',
      position: 'right',
    },
    {
      selector: '[data-tour="dir-sessions"]',
      title: 'Mes sessions',
      text: 'Retrouvez toutes vos sessions en cours ou passées. Suivez en temps réel les sélections des enseignants.',
      position: 'right',
    },
    {
      selector: '[data-tour="dir-roster"]',
      title: 'Répertoire enseignants',
      text: 'Gérez votre liste d\'enseignants permanents et invitez-les rapidement à n\'importe quelle session.',
      position: 'right',
    },
    {
      selector: '[data-tour="dir-billing"]',
      title: 'Abonnement',
      text: 'Consultez votre plan actuel et débloquez les fonctionnalités Pro (échanges, export JPG, WhatsApp…).',
      position: 'right',
    },
  ];

  ngOnInit(): void {
    this.sub.load();
    if (!this.onboarding.isDone('director')) {
      this.showOnboarding.set(true);
    }
  }

  dismissOnboarding(): void {
    this.onboarding.markDone('director');
    this.showOnboarding.set(false);
  }
}
