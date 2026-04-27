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
  readonly downloading = signal(false);
  readonly policyVersion = signal<string>('');

  ngOnInit(): void {
    this.api.get<{ version: string }>('/auth/policy-metadata').subscribe({
      next: (m) => this.policyVersion.set(m.version),
      error: () => this.policyVersion.set(''),
    });
  }

  async downloadDataExport(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    const token = localStorage.getItem('tt_token');
    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/me/export', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timetutor-export-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Impossible d'exporter les données");
    } finally {
      this.downloading.set(false);
    }
  }
}
