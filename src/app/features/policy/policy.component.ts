import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-policy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './policy.component.html',
})
export class PolicyComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly policyVersion = signal<string>('');

  ngOnInit(): void {
    this.api.get<{ version: string }>('/auth/policy-metadata').subscribe({
      next: (m) => this.policyVersion.set(m.version),
      error: () => this.policyVersion.set(''),
    });
  }

  downloadDataExport(): void {
    this.api.getBlob('/auth/me/export').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetutor-export-donnees.json';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }
}
