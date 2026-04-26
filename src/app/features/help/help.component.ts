import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SvgIconComponent } from '../../shared/svg-icon.component';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [RouterLink, SvgIconComponent],
  templateUrl: './help.component.html',
})
export class HelpComponent {
  activeTab = signal<'director' | 'teacher'>('director');
}
