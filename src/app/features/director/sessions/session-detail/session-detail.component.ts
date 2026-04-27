import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { SocketService } from '../../../../core/services/socket.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Session, TimeSlot, Teacher, Subject } from '../../../../core/models';
import { DatePipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, CommonModule, ReactiveFormsModule],
  templateUrl: './session-detail.component.html',
})
export class SessionDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly session = signal<Session | null>(null);
  readonly slots = signal<TimeSlot[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly teacherSubjectSuggestions = signal<Subject[]>([]);
  readonly editSubjectSuggestions = signal<Subject[]>([]);
  readonly activeTab = signal<'slots' | 'teachers'>('slots');
  readonly loading = signal(true);

  readonly showAddTeacher = signal(false);
  readonly showAddSlot = signal(false);
  readonly addingTeacher = signal(false);
  readonly addingSlot = signal(false);
  readonly csvImporting = signal(false);
  readonly addTeacherError = signal('');
  readonly addSlotError = signal('');
  readonly invitingAll = signal(false);
  readonly actionByTeacherId = signal<Record<string, 'inviting' | 'reminding' | 'updating' | 'removing'>>({});
  readonly showEditTeacher = signal(false);
  readonly editingTeacherId = signal<string | null>(null);
  readonly confirmRemoveTeacherId = signal<string | null>(null);
  readonly editingTeacherError = signal('');

  readonly otherSessionsForDuplicate = signal<{ id: string; name: string }[]>([]);
  readonly showDuplicateModal = signal(false);
  readonly duplicateSourceId = signal('');
  readonly duplicating = signal(false);
  readonly schoolClasses = signal<{ id: string; name: string }[]>([]);
  readonly selectedClassId = signal('');
  readonly savingClass = signal(false);

  readonly teacherForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subjectQuery: ['', Validators.required],
    subjectId: ['', Validators.required],
  });

  readonly slotForm = this.fb.group({
    dayOfWeek: ['Lundi', Validators.required],
    startTime: ['08:00', Validators.required],
    endTime: ['09:00', Validators.required],
    room: [''],
  }, { validators: (group) => {
    const start = group.get('startTime')?.value;
    const end = group.get('endTime')?.value;
    return start && end && start >= end ? { timeInvalid: true } : null;
  }});

  readonly weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  readonly editTeacherForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subjectQuery: ['', Validators.required],
    subjectId: ['', Validators.required],
  });

  private sessionId = '';

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.params['id'];
    this.loadAll();
    this.api.get<Array<{ id: string; name: string }>>('/sessions').subscribe((rows) => {
      this.otherSessionsForDuplicate.set(rows.filter((r) => r.id !== this.sessionId));
    });
    this.socket.connect();
    this.socket.joinSession(this.sessionId);
    this.socket.onSlotSelected().subscribe(({ slotId, teacherName }) =>
      this.updateSlot(slotId, { status: 'taken', teacherName: teacherName || undefined })
    );
    this.socket.onSlotReleased().subscribe(({ slotId }) =>
      this.updateSlot(slotId, {
        status: 'free',
        teacherName: undefined,
        selectedByTeacherId: undefined,
      })
    );
    this.socket.onSlotValidated().subscribe(({ slotId }) => this.updateSlot(slotId, { status: 'validated' }));
    this.socket.onSlotLocked().subscribe(({ slotId }) => this.updateSlot(slotId, { status: 'locked' }));
  }

  loadAll(): void {
    this.api.get<Session>(`/sessions/${this.sessionId}`).subscribe((s) => {
      this.session.set(s);
      const raw = s as Session & { schoolClassId?: string | null };
      this.selectedClassId.set(raw.schoolClassId ?? '');
      this.api
        .get<Array<{ id: string; name: string; isActive: boolean }>>('/school-classes?includeInactive=1')
        .subscribe((rows) => {
          const sid = raw.schoolClassId;
          const list = rows.filter((r) => r.isActive || r.id === sid);
          this.schoolClasses.set(
            list.map((r) => ({
              id: r.id,
              name: r.name + (!r.isActive && r.id === sid ? ' (masquée)' : ''),
            }))
          );
        });
    });
    this.api.get<TimeSlot[]>(`/sessions/${this.sessionId}/slots`).subscribe((s) => {
      this.slots.set(this.normalizeSlotsFromApi(s));
    });
    this.api.get<Subject[]>('/subjects').subscribe((subjects) => this.subjects.set(subjects));
    this.api.get<Teacher[]>(`/sessions/${this.sessionId}/teachers`).subscribe((t) => {
      this.teachers.set(t);
      this.loading.set(false);
    });
  }

  private updateSlot(
    slotId: string,
    patch: Partial<Pick<TimeSlot, 'status' | 'teacherName' | 'selectedByTeacherId'>>
  ): void {
    this.slots.update((slots) => slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)));
  }

  /** Tolère une désynchronisation DB : s'il y a une sélection, le créneau est affiché comme réservé. */
  private normalizeSlotsFromApi(slots: TimeSlot[]): TimeSlot[] {
    return slots.map((slot) => {
      if (slot.status === 'validated') return slot;
      if (slot.selectedByTeacherId || slot.teacherName || slot.status === 'taken') {
        return { ...slot, status: 'taken' as const };
      }
      return { ...slot, status: 'free' as const };
    });
  }

  addTeacher(): void {
    if (!this.teacherForm.value.subjectId) {
      this.addTeacherError.set('La matière est obligatoire.');
      return;
    }
    if (this.teacherForm.invalid || this.addingTeacher()) return;
    this.addingTeacher.set(true);
    this.addTeacherError.set('');
    const v = this.teacherForm.value;
    this.api.post(`/sessions/${this.sessionId}/teachers`, {
      fullName: v.fullName,
      email: v.email,
      phone: v.phone || undefined,
      subjectIds: [v.subjectId],
    }).subscribe({
      next: () => {
        this.teacherForm.reset({ fullName: '', email: '', phone: '', subjectQuery: '', subjectId: '' });
        this.teacherSubjectSuggestions.set([]);
        this.showAddTeacher.set(false);
        this.addingTeacher.set(false);
        this.loadAll();
      },
      error: (e) => {
        this.addTeacherError.set(e.error?.error ?? 'Erreur ajout enseignant');
        this.addingTeacher.set(false);
      },
    });
  }

  addSlot(): void {
    if (this.slotForm.invalid || this.addingSlot()) return;
    this.addingSlot.set(true);
    this.addSlotError.set('');
    const v = this.slotForm.value;
    this.api.post(`/sessions/${this.sessionId}/slots`, {
      dayOfWeek: v.dayOfWeek,
      startTime: v.startTime,
      endTime: v.endTime,
      room: v.room || undefined,
    }).subscribe({
      next: () => {
        this.slotForm.reset({ dayOfWeek: 'Lundi', startTime: '08:00', endTime: '09:00', room: '' });
        this.showAddSlot.set(false);
        this.addingSlot.set(false);
        this.loadAll();
      },
      error: (e) => {
        this.addSlotError.set(e.error?.error ?? 'Erreur ajout créneau');
        this.addingSlot.set(false);
      },
    });
  }

  importCsv(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.csvImporting.set(true);
    const formData = new FormData();
    formData.append('file', file);
    this.api.post<{ imported: number }>(`/sessions/${this.sessionId}/teachers/import`, formData).subscribe({
      next: (r) => {
        this.toast.success(`${r.imported} enseignant(s) importé(s) avec succès.`);
        this.csvImporting.set(false);
        input.value = '';
        this.loadAll();
      },
      error: (e) => {
        this.toast.error(e.error?.error ?? 'Erreur import CSV');
        this.csvImporting.set(false);
        input.value = '';
      },
    });
  }

  validateSlot(slotId: string): void {
    this.api.post(`/sessions/${this.sessionId}/slots/${slotId}/validate`, {}).subscribe(() => {
      this.updateSlot(slotId, { status: 'validated' });
    });
  }

  countSlots(status: string): number {
    return this.slots().filter(s => s.status === status).length;
  }

  unvalidateSlot(slotId: string): void {
    this.api.post(`/sessions/${this.sessionId}/slots/${slotId}/unvalidate`, {}).subscribe(() => {
      this.updateSlot(slotId, { status: 'taken' });
    });
  }

  inviteTeacher(teacherId: string): void {
    this.startTeacherAction(teacherId, 'inviting');
    this.api.post(`/sessions/${this.sessionId}/teachers/${teacherId}/invite`, {}).subscribe({
      next: () => {
        this.stopTeacherAction(teacherId);
        this.toast.success('Invitation envoyée par e-mail.');
        this.loadAll();
      },
      error: (e) => {
        this.stopTeacherAction(teacherId);
        this.toast.error(e.error?.error ?? 'Erreur envoi invitation');
      },
    });
  }

  remindTeacher(teacherId: string): void {
    this.startTeacherAction(teacherId, 'reminding');
    this.api.post(`/sessions/${this.sessionId}/teachers/${teacherId}/remind`, {}).subscribe({
      next: () => {
        this.stopTeacherAction(teacherId);
        this.toast.success('Relance envoyée par e-mail.');
        this.loadAll();
      },
      error: (e) => {
        this.stopTeacherAction(teacherId);
        this.toast.error(e.error?.error ?? 'Erreur relance');
      }
    });
  }

  removeTeacher(teacherId: string): void {
    if (this.confirmRemoveTeacherId() !== teacherId) {
      this.confirmRemoveTeacherId.set(teacherId);
      return;
    }
    this.confirmRemoveTeacherId.set(null);
    this.startTeacherAction(teacherId, 'removing');
    this.api.delete(`/sessions/${this.sessionId}/teachers/${teacherId}`).subscribe({
      next: () => {
        this.stopTeacherAction(teacherId);
        this.loadAll();
      },
      error: () => this.stopTeacherAction(teacherId),
    });
  }

  inviteAllTeachers(): void {
    if (this.invitingAll()) return;
    this.invitingAll.set(true);
    this.api.post<{ invited: number; failed: number; eligible: number; totalTeachers: number; alreadyInvited: number }>(`/sessions/${this.sessionId}/teachers/invite-all`, {}).subscribe({
      next: (result) => {
        this.invitingAll.set(false);
        this.loadAll();
        if (result.eligible === 0) {
          this.toast.success(`Aucun nouvel enseignant à inviter (déjà invités : ${result.alreadyInvited}/${result.totalTeachers}).`);
          return;
        }
        this.toast.success(`Invitations envoyées : ${result.invited}/${result.eligible}${result.failed ? ` (échecs : ${result.failed})` : ''}`);
      },
      error: (e) => {
        this.invitingAll.set(false);
        this.toast.error(e.error?.error ?? 'Erreur invitation groupée');
      },
    });
  }

  openEditTeacher(teacher: Teacher): void {
    this.editingTeacherId.set(teacher.id);
    this.editingTeacherError.set('');
    this.editTeacherForm.reset({
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone ?? '',
      subjectQuery: teacher.subjects?.[0]?.name ?? '',
      subjectId: teacher.subjects?.[0]?.id ?? '',
    });
    this.editSubjectSuggestions.set([]);
    this.showEditTeacher.set(true);
  }

  closeEditTeacher(): void {
    this.showEditTeacher.set(false);
    this.editingTeacherId.set(null);
    this.editingTeacherError.set('');
    this.editSubjectSuggestions.set([]);
  }

  saveTeacher(): void {
    const teacherId = this.editingTeacherId();
    if (!teacherId || this.editTeacherForm.invalid) return;
    this.startTeacherAction(teacherId, 'updating');
    this.editingTeacherError.set('');
    const value = this.editTeacherForm.value;
    if (!value.subjectId) {
      this.editingTeacherError.set('La matière est obligatoire.');
      this.stopTeacherAction(teacherId);
      return;
    }
    this.api.put(`/sessions/${this.sessionId}/teachers/${teacherId}`, {
      fullName: value.fullName,
      email: value.email,
      phone: value.phone || null,
      subjectIds: [value.subjectId],
    }).subscribe({
      next: () => {
        this.stopTeacherAction(teacherId);
        this.closeEditTeacher();
        this.loadAll();
      },
      error: (e) => {
        this.stopTeacherAction(teacherId);
        this.editingTeacherError.set(e.error?.error ?? 'Erreur de modification');
      },
    });
  }

  setStatus(status: string): void {
    this.api.put(`/sessions/${this.sessionId}/status`, { status }).subscribe(() => {
      this.session.update(s => s ? { ...s, status: status as Session['status'] } : s);
    });
  }

  openDuplicateModal(): void {
    this.duplicateSourceId.set('');
    this.showDuplicateModal.set(true);
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal.set(false);
  }

  runDuplicateGrid(): void {
    const src = this.duplicateSourceId();
    if (!src || this.duplicating()) return;
    this.duplicating.set(true);
    this.api
      .post<{ duplicated: number }>(`/sessions/${this.sessionId}/slots/duplicate-from`, { sourceSessionId: src })
      .subscribe({
        next: (r) => {
          this.duplicating.set(false);
          this.showDuplicateModal.set(false);
          this.toast.success(`${r.duplicated} créneau(x) copié(s).`);
          this.loadAll();
        },
        error: (e) => {
          this.duplicating.set(false);
          this.toast.error(e.error?.error ?? 'Erreur');
        },
      });
  }

  saveSessionClass(): void {
    if (this.savingClass()) return;
    const uuid = this.selectedClassId();
    this.savingClass.set(true);
    this.api.put(`/sessions/${this.sessionId}`, { schoolClassId: uuid || null }).subscribe({
      next: () => {
        this.savingClass.set(false);
        this.toast.success('Classe enregistrée.');
        this.loadAll();
      },
      error: (e) => {
        this.savingClass.set(false);
        this.toast.error(e.error?.error ?? 'Erreur');
      },
    });
  }

  sessionYear(s: Session | null): string {
    if (!s) return '';
    return s.academicYear ?? '';
  }

  async exportPdf(): Promise<void> {
    const url = `http://localhost:3000/api/v1/sessions/${this.sessionId}/export/pdf?includeTeacherName=true&includeContact=true&includeEmail=true&includeSubject=true&includeRoom=true`;
    const token = localStorage.getItem('tt_token');
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Erreur export');
      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = fileUrl;
      const sessionName = (this.session()?.name ?? 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.download = `emploi-du-temps-${sessionName}.pdf`;
      a.click();
      URL.revokeObjectURL(fileUrl);
    } catch {
      this.toast.error("Impossible d'exporter le PDF.");
    }
  }

  shareWhatsApp(): void {
    const session = this.session();
    if (!session) return;
    const text = encodeURIComponent(
      `TimeTutor - Session ${session.name} (${this.sessionYear(session)})\n` +
      `Suivi: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  slotClass(status: string): string {
    return { free: 'bg-white border-amber/30', taken: 'bg-molten/12 border-molten/40', validated: 'bg-steel/50 border-steel/70' }[status] ?? '';
  }

  statusBadge(status: string): string {
    return { free: 'Libre', taken: 'Réservé', validated: 'Validé' }[status] ?? status;
  }

  coveragePct(): number {
    const total = this.slots().length;
    if (!total) return 0;
    return Math.round(100 * this.slots().filter(s => s.status !== 'free').length / total);
  }

  slotDays(): string[] {
    const order = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return order.filter(d => this.slots().some(s => s.dayOfWeek === d));
  }

  uniqueTimes(): { start: string; end: string }[] {
    const seen = new Set<string>();
    const times: { start: string; end: string }[] = [];
    for (const slot of this.slots()) {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!seen.has(key)) { seen.add(key); times.push({ start: slot.startTime, end: slot.endTime }); }
    }
    return times.sort((a, b) => a.start.localeCompare(b.start));
  }

  getSlot(day: string, startTime: string): TimeSlot | null {
    return this.slots().find(s => s.dayOfWeek === day && s.startTime === startTime) ?? null;
  }

  slotCardClass(status: string): string {
    return {
      free:      'bg-white border border-amber/35 text-navy/80',
      taken:     'bg-molten/12 border border-molten/40 text-navy',
      locked:    'bg-steel/70 border border-steel/90 text-navy/50',
      validated: 'bg-steel/50 border border-steel/80 text-navy/50',
    }[status] ?? 'bg-white border border-cream/60';
  }

  badgeClass(status: string): string {
    return {
      free:      'bg-cream/60 text-navy/50',
      taken:     'bg-molten/20 text-navy',
      validated: 'bg-steel text-navy/50',
    }[status] ?? '';
  }

  private startTeacherAction(teacherId: string, action: 'inviting' | 'reminding' | 'updating' | 'removing'): void {
    this.actionByTeacherId.update(actions => ({ ...actions, [teacherId]: action }));
  }

  private stopTeacherAction(teacherId: string): void {
    this.actionByTeacherId.update(actions => {
      const next = { ...actions };
      delete next[teacherId];
      return next;
    });
  }

  teacherAction(teacherId: string): 'inviting' | 'reminding' | 'updating' | 'removing' | null {
    return this.actionByTeacherId()[teacherId] ?? null;
  }

  inviteButtonLabel(teacher: Teacher): string {
    const action = this.teacherAction(teacher.id);
    if (action === 'inviting') return 'Invitation...';
    return 'Inviter';
  }

  remindButtonLabel(teacher: Teacher): string {
    const action = this.teacherAction(teacher.id);
    if (action === 'reminding') return 'Relance...';
    return 'Relancer';
  }

  onTeacherSubjectInput(query: string): void {
    this.teacherForm.patchValue({ subjectQuery: query, subjectId: '' }, { emitEvent: false });
    this.teacherSubjectSuggestions.set(this.filterSubjectSuggestions(query));
  }

  selectTeacherSubject(subject: Subject): void {
    this.teacherForm.patchValue({ subjectQuery: subject.name, subjectId: subject.id }, { emitEvent: false });
    this.teacherSubjectSuggestions.set([]);
  }

  onEditSubjectInput(query: string): void {
    this.editTeacherForm.patchValue({ subjectQuery: query, subjectId: '' }, { emitEvent: false });
    this.editSubjectSuggestions.set(this.filterSubjectSuggestions(query));
  }

  selectEditSubject(subject: Subject): void {
    this.editTeacherForm.patchValue({ subjectQuery: subject.name, subjectId: subject.id }, { emitEvent: false });
    this.editSubjectSuggestions.set([]);
  }

  private filterSubjectSuggestions(query: string): Subject[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.subjects().slice(0, 8);
    return this.subjects().filter((subject) => subject.name.toLowerCase().includes(q)).slice(0, 8);
  }
}
