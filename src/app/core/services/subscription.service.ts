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
  planCode: string;
  displayName: string;
  status: string;
  featuresJson: Record<FeatureKey, boolean>;
  limitsJson: Record<string, number | null>;
  limitsOverrideJson: Record<string, number | null>;
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
    if (!sub.featuresJson) return true;
    return sub.featuresJson[key] !== false;
  }

  get planCode(): string {
    return this.subscription()?.planCode ?? 'standard';
  }

  get planName(): string {
    return this.subscription()?.displayName ?? 'Standard';
  }

  get status(): string {
    return this.subscription()?.status ?? 'active';
  }
}
