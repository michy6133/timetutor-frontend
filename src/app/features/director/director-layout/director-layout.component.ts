import { Component, inject, OnInit } from '@angular/core';
import { signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';
import { OnboardingService } from '../../../shared/onboarding.service';
import { OnboardingTooltipComponent, OnboardingStep } from '../../../shared/onboarding-tooltip.component';

@Component({
  selector: 'app-director-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SvgIconComponent, OnboardingTooltipComponent],
  templateUrl: './director-layout.component.html',
})
export class DirectorLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingService);
  readonly mobileMenuOpen = signal(false);
  readonly showOnboarding = signal(false);

  readonly onboardingSteps: OnboardingStep[] = [
    { text: 'Bienvenue sur TimeTutor ! Commençons par configurer vos classes.' },
    { text: 'Ajoutez ensuite vos matières depuis le menu "Matières".' },
    { text: 'Créez votre première session d\'emploi du temps.' },
    { text: 'Invitez vos enseignants par email depuis la session.' },
    { text: 'Validez les créneaux choisis par les enseignants. C\'est tout !' },
  ];

  ngOnInit(): void {
    if (!this.onboarding.isDone()) {
      this.showOnboarding.set(true);
    }
  }

  dismissOnboarding(): void {
    this.showOnboarding.set(false);
    this.onboarding.markDone();
  }
}
