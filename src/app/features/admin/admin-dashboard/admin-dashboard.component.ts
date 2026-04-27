import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface AdminStats {
  activeSchools: number; openSessions: number; totalTeachers: number; validatedSlots: number;
  totalUsers: number; directorCount: number; teacherCount: number; adminCount: number;
}
interface SchoolRow {
  id: string; name: string; subscriptionPlan: string; isActive: boolean;
  directorsCount: number; sessionsCount: number;
}
interface PlanRow {
  code: string; displayName: string; isActive: boolean;
  limitsJson: Record<string, number | null>;
  featuresJson: Record<string, boolean>;
  validityDays: number;
}
interface UserRow {
  id: string; email: string; fullName: string; role: string;
  isActive: boolean; createdAt: string; schoolName: string | null;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly stats = signal<AdminStats | null>(null);
  readonly schools = signal<SchoolRow[]>([]);
  readonly plans = signal<PlanRow[]>([]);
  readonly users = signal<UserRow[]>([]);
  readonly togglingId = signal('');
  readonly deletingUserId = signal('');
  readonly activeTab = signal<'schools' | 'plans' | 'users'>('schools');
  readonly editingPlan = signal<string | null>(null);
  readonly planEditBuffer = signal<PlanRow | null>(null);
  readonly savingPlan = signal(false);
  readonly selectedSchoolId = signal<string | null>(null);
  readonly userRoleFilter = signal<string>('all');

  // Create admin form
  readonly showCreateAdmin = signal(false);
  readonly createAdminEmail = signal('');
  readonly createAdminName = signal('');
  readonly createAdminPassword = signal('');
  readonly creatingAdmin = signal(false);

  readonly featureKeys = [
    'pdfExport', 'jpgExport', 'csvImport',
    'slotGenerator', 'gridDuplicate', 'slotNegotiations', 'whatsappNotifications',
  ] as const;

  readonly featureLabels: Record<string, string> = {
    pdfExport: 'Export PDF',
    jpgExport: 'Export JPG',
    csvImport: 'Import CSV enseignants',
    slotGenerator: 'Générateur de grille',
    gridDuplicate: 'Duplication de grille',
    slotNegotiations: 'Négociations de créneaux',
    whatsappNotifications: 'Partage WhatsApp',
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.api.get<AdminStats>('/admin/stats').subscribe(s => this.stats.set(s));
    this.api.get<SchoolRow[]>('/admin/schools').subscribe(s => this.schools.set(s));
    this.api.get<PlanRow[]>('/admin/plans').subscribe(p => this.plans.set(p));
    this.api.get<UserRow[]>('/admin/users').subscribe(u => this.users.set(u));
  }

  filteredUsers(): UserRow[] {
    const f = this.userRoleFilter();
    return f === 'all' ? this.users() : this.users().filter(u => u.role === f);
  }

  roleBadgeClass(role: string): string {
    return { super_admin: 'bg-brick/12 text-brick', director: 'bg-navy/10 text-navy', teacher: 'bg-emerald/15 text-emerald' }[role] ?? 'bg-steel/50 text-navy/50';
  }

  roleLabel(role: string): string {
    return { super_admin: 'Admin', director: 'Directeur', teacher: 'Enseignant' }[role] ?? role;
  }

  deleteUser(user: UserRow): void {
    if (this.deletingUserId()) return;
    if (!confirm(`Supprimer ${user.email} ?`)) return;
    this.deletingUserId.set(user.id);
    this.api.delete(`/admin/users/${user.id}`).subscribe({
      next: () => { this.users.update(list => list.filter(u => u.id !== user.id)); this.deletingUserId.set(''); this.toast.success('Utilisateur supprimé.'); },
      error: (e) => { this.deletingUserId.set(''); this.toast.error(e.error?.error ?? 'Erreur'); },
    });
  }

  submitCreateAdmin(): void {
    if (this.creatingAdmin()) return;
    const email = this.createAdminEmail().trim();
    const fullName = this.createAdminName().trim();
    const password = this.createAdminPassword();
    if (!email || !fullName || password.length < 8) { this.toast.error('Remplissez tous les champs (mot de passe ≥ 8 car.).'); return; }
    this.creatingAdmin.set(true);
    this.api.post<UserRow>('/admin/users', { email, fullName, password }).subscribe({
      next: (u) => {
        this.creatingAdmin.set(false);
        this.showCreateAdmin.set(false);
        this.createAdminEmail.set(''); this.createAdminName.set(''); this.createAdminPassword.set('');
        this.users.update(list => [u, ...list]);
        this.toast.success(`Admin "${u.fullName}" créé.`);
      },
      error: (e) => { this.creatingAdmin.set(false); this.toast.error(e.error?.error ?? 'Erreur'); },
    });
  }

  toggleSchool(school: SchoolRow): void {
    if (this.togglingId()) return;
    this.togglingId.set(school.id);
    this.api.put<{ isActive: boolean }>(`/admin/schools/${school.id}/toggle`, {}).subscribe({
      next: (r) => {
        this.schools.update(list => list.map(s => s.id === school.id ? { ...s, isActive: r.isActive } : s));
        this.togglingId.set('');
      },
      error: () => this.togglingId.set(''),
    });
  }

  updateSubscription(schoolId: string, planCode: string): void {
    this.api.put(`/admin/schools/${schoolId}/subscription`, { planCode }).subscribe({
      next: () => {
        this.toast.success('Abonnement mis à jour.');
        this.loadData();
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Erreur'),
    });
  }

  openEditPlan(plan: PlanRow): void {
    this.editingPlan.set(plan.code);
    this.planEditBuffer.set(JSON.parse(JSON.stringify(plan)));
  }

  cancelEditPlan(): void {
    this.editingPlan.set(null);
    this.planEditBuffer.set(null);
  }

  toggleFeature(key: string): void {
    const buf = this.planEditBuffer();
    if (!buf) return;
    this.planEditBuffer.set({
      ...buf,
      featuresJson: { ...buf.featuresJson, [key]: !buf.featuresJson[key] },
    });
  }

  updateLimit(key: string, value: string): void {
    const buf = this.planEditBuffer();
    if (!buf) return;
    const num = value === '' || value === '0' ? null : Number(value);
    this.planEditBuffer.set({
      ...buf,
      limitsJson: { ...buf.limitsJson, [key]: num },
    });
  }

  savePlan(): void {
    const buf = this.planEditBuffer();
    if (!buf || this.savingPlan()) return;
    this.savingPlan.set(true);
    this.api.put(`/admin/plans/${buf.code}`, {
      displayName: buf.displayName,
      limitsJson: buf.limitsJson,
      featuresJson: buf.featuresJson,
      validityDays: buf.validityDays,
    }).subscribe({
      next: () => {
        this.savingPlan.set(false);
        this.toast.success(`Plan "${buf.displayName}" mis à jour.`);
        this.editingPlan.set(null);
        this.planEditBuffer.set(null);
        this.loadData();
      },
      error: (e) => {
        this.savingPlan.set(false);
        this.toast.error(e.error?.error ?? 'Erreur lors de la sauvegarde.');
      },
    });
  }

  planBadgeClass(plan: string): string {
    return {
      standard: 'bg-steel/60 text-navy/60',
      pro: 'bg-brick/10 text-brick',
      premium: 'bg-navy/10 text-navy',
    }[plan] ?? 'bg-steel/60 text-navy/60';
  }

  limitKeys(plan: PlanRow): string[] {
    return Object.keys(plan.limitsJson ?? {});
  }

  limitLabel(key: string): string {
    return {
      maxSchools: 'Max écoles',
      maxSessionsPerSchool: 'Max sessions / école',
      maxTeachersPerSession: 'Max enseignants / session',
    }[key] ?? key;
  }
}
