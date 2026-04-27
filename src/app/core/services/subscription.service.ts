import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export type FeatureKey =
  | 'pdfExport'
  | 'jpgExport'
  | 'csvImport'
  | 'slotGenerator'
  | 'gridDuplicate'
  | 'slotNegotiations'
  | 'whatsappNotifications';

interface SubscriptionData {
  plan_code: string;
  display_name: string;
  status: string;
  features_json: Record<FeatureKey, boolean>;
  limits_json: Record<string, number | null>;
  limits_override_json: Record<string, number | null>;
  usage: {
    sessionsCount: number;
    sessionsLimit: number | null;
    maxTeachersInSession: number;
    teachersPerSessionLimit: number | null;
  };
  usageAlerts: string[];
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(ApiService);

  readonly subscription = signal<SubscriptionData | null>(null);
  readonly loaded = signal(false);

  load(): void {
    this.api.get<SubscriptionData>('/admin/me/subscription').subscribe({
      next: (data) => {
        this.subscription.set(data);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }

  hasFeature(key: FeatureKey): boolean {
    const sub = this.subscription();
    if (!sub) return true;
    if (!['active', 'trial'].includes(sub.status)) return false;
    return sub.features_json[key] !== false;
  }

  get planCode(): string {
    return this.subscription()?.plan_code ?? 'standard';
  }

  get planName(): string {
    return this.subscription()?.display_name ?? 'Standard';
  }

  get status(): string {
    return this.subscription()?.status ?? 'active';
  }
}
