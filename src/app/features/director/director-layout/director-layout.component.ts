import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

@Component({
  selector: 'app-director-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SvgIconComponent],
  templateUrl: './director-layout.component.html',
})
export class DirectorLayoutComponent {
  readonly auth = inject(AuthService);
}
