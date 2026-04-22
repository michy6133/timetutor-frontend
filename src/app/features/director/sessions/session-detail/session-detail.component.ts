import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { SocketService } from '../../../../core/services/socket.service';
import type { Session, TimeSlot, Teacher } from '../../../../core/models';
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
  private readonly fb = inject(FormBuilder);

  readonly session = signal<Session | null>(null);
  readonly slots = signal<TimeSlot[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly activeTab = signal<'slots' | 'teachers'>('slots');
  readonly loading = signal(true);

  readonly showAddTeacher = signal(false);
  readonly showAddSlot = signal(false);
  readonly addingTeacher = signal(false);
  readonly addingSlot = signal(false);
  readonly csvImporting = signal(false);
  readonly addTeacherError = signal('');
  readonly addSlotError = signal('');

  readonly teacherForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
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

  private sessionId = '';

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.params['id'];
    this.loadAll();
    this.socket.connect();
    this.socket.joinSession(this.sessionId);
    this.socket.onSlotSelected().subscribe(({ slotId }) => this.updateSlotStatus(slotId, 'taken'));
    this.socket.onSlotReleased().subscribe(({ slotId }) => this.updateSlotStatus(slotId, 'free'));
    this.socket.onSlotValidated().subscribe(({ slotId }) => this.updateSlotStatus(slotId, 'validated'));
  }

  loadAll(): void {
    this.api.get<Session>(`/sessions/${this.sessionId}`).subscribe(s => this.session.set(s));
    this.api.get<TimeSlot[]>(`/sessions/${this.sessionId}/slots`).subscribe(s => this.slots.set(s));
    this.api.get<Teacher[]>(`/sessions/${this.sessionId}/teachers`).subscribe(t => {
      this.teachers.set(t);
      this.loading.set(false);
    });
  }

  private updateSlotStatus(slotId: string, status: 'free' | 'taken' | 'validated'): void {
    this.slots.update(slots => slots.map(s => s.id === slotId ? { ...s, status } : s));
  }

  addTeacher(): void {
    if (this.teacherForm.invalid || this.addingTeacher()) return;
    this.addingTeacher.set(true);
    this.addTeacherError.set('');
    const v = this.teacherForm.value;
    this.api.post(`/sessions/${this.sessionId}/teachers`, {
      fullName: v.fullName,
      email: v.email,
      phone: v.phone || undefined,
    }).subscribe({
      next: () => {
        this.teacherForm.reset({ fullName: '', email: '', phone: '' });
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
        alert(`${r.imported} enseignant(s) importé(s) avec succès.`);
        this.csvImporting.set(false);
        input.value = '';
        this.loadAll();
      },
      error: (e) => {
        alert(e.error?.error ?? 'Erreur import CSV');
        this.csvImporting.set(false);
        input.value = '';
      },
    });
  }

  validateSlot(slotId: string): void {
    this.api.post(`/sessions/${this.sessionId}/slots/${slotId}/validate`, {}).subscribe(() => {
      this.updateSlotStatus(slotId, 'validated');
    });
  }

  countSlots(status: string): number {
    return this.slots().filter(s => s.status === status).length;
  }

  unvalidateSlot(slotId: string): void {
    this.api.post(`/sessions/${this.sessionId}/slots/${slotId}/unvalidate`, {}).subscribe(() => {
      this.updateSlotStatus(slotId, 'taken');
    });
  }

  inviteTeacher(teacherId: string): void {
    this.api.post(`/sessions/${this.sessionId}/teachers/${teacherId}/invite`, {}).subscribe({
      next: () => this.loadAll(),
      error: (e) => alert(e.error?.error ?? 'Erreur envoi invitation'),
    });
  }

  remindTeacher(teacherId: string): void {
    this.api.post(`/sessions/${this.sessionId}/teachers/${teacherId}/remind`, {}).subscribe({
      next: () => alert('Relance envoyée !'),
    });
  }

  removeTeacher(teacherId: string): void {
    if (!confirm('Supprimer cet enseignant de la session ?')) return;
    this.api.delete(`/sessions/${this.sessionId}/teachers/${teacherId}`).subscribe({
      next: () => this.loadAll(),
    });
  }

  setStatus(status: string): void {
    this.api.put(`/sessions/${this.sessionId}/status`, { status }).subscribe(() => {
      this.session.update(s => s ? { ...s, status: status as Session['status'] } : s);
    });
  }

  exportPdf(): void {
    const url = `http://localhost:3000/api/v1/sessions/${this.sessionId}/export/pdf?includeTeacherName=true&includeContact=true&includeEmail=true&includeSubject=true`;
    window.open(url, '_blank');
  }

  shareWhatsApp(): void {
    const session = this.session();
    if (!session) return;
    const text = encodeURIComponent(
      `TimeTutor - Session ${session.name} (${session.academicYear})\n` +
      `Suivi: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  slotClass(status: string): string {
    return { free: 'bg-green-50 border-green-200', taken: 'bg-orange-50 border-orange-200', validated: 'bg-blue-50 border-blue-200' }[status] ?? '';
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
      free:      'bg-white border border-gray-200 text-gray-600',
      taken:     'bg-amber-50 border border-amber-300 text-amber-900',
      validated: 'bg-blue-50 border border-blue-300 text-blue-900',
    }[status] ?? 'bg-white border border-gray-200';
  }

  badgeClass(status: string): string {
    return {
      free: 'bg-gray-100 text-gray-500',
      taken: 'bg-amber-100 text-amber-700',
      validated: 'bg-blue-100 text-blue-700',
    }[status] ?? '';
  }
}
