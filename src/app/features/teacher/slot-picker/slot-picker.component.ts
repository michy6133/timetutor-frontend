import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../core/services/toast.service';
import type { TimeSlot } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../../shared/svg-icon.component';
interface TeacherInfo { fullName: string; email: string; }
interface SessionInfo { name: string; academicYear: string; status: string; }
interface VerifyResponse { valid: boolean; sessionId: string; teacherId: string; teacher: TeacherInfo; session: SessionInfo; }
interface ContactIncomingRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  createdAt: string;
  slotId: string;
  requesterName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}
interface ContactOutgoingRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  createdAt: string;
  slotId: string;
  targetName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}
interface ContactRequestsResponse {
  incoming: ContactIncomingRequest[];
  outgoing: ContactOutgoingRequest[];
}

@Component({
  selector: 'app-slot-picker',
  standalone: true,
  imports: [CommonModule, SvgIconComponent],
  templateUrl: './slot-picker.component.html',
})
export class SlotPickerComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly teacher = signal<TeacherInfo | null>(null);
  readonly session = signal<SessionInfo | null>(null);
  readonly slots = signal<TimeSlot[]>([]);
  readonly selectedSlotIds = signal<Set<string>>(new Set());
  readonly actionLoading = signal<string>('');
  readonly contactModalOpen = signal(false);
  readonly contactTargetSlot = signal<TimeSlot | null>(null);
  readonly contactMessage = signal('');
  readonly incomingRequests = signal<ContactIncomingRequest[]>([]);
  readonly outgoingRequests = signal<ContactOutgoingRequest[]>([]);

  private token = '';
  private sessionId = '';
  private myTeacherId = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    this.api.get<VerifyResponse>(`/teachers/verify/${this.token}`).subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        this.session.set(res.session);
        this.sessionId = res.sessionId;
        this.myTeacherId = res.teacherId;
        this.loadSlots();
        this.loadContactRequests();
        this.socket.connect();
        this.socket.joinSession(this.sessionId);
        this.socket.onSlotSelected().subscribe(({ slotId }) => this.updateStatus(slotId, 'taken'));
        this.socket.onSlotReleased().subscribe(({ slotId }) => this.updateStatus(slotId, 'free'));
        this.socket.onSlotValidated().subscribe(({ slotId }) => this.updateStatus(slotId, 'validated'));
      },
      error: () => {
        this.error.set('Lien invalide ou expiré. Contactez votre directeur.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }

  loadSlots(): void {
    this.api.get<TimeSlot[]>(`/sessions/${this.sessionId}/slots/teacher/${this.token}`).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        const myIds = new Set(
          slots.filter(s => s.selectedByTeacherId === this.myTeacherId).map(s => s.id)
        );
        this.selectedSlotIds.set(myIds);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadContactRequests(): void {
    this.api.get<ContactRequestsResponse>(`/sessions/${this.sessionId}/slots/contact-requests/${this.token}`).subscribe({
      next: (payload) => {
        this.incomingRequests.set(payload.incoming);
        this.outgoingRequests.set(payload.outgoing);
      },
      error: () => undefined,
    });
  }

  private updateStatus(slotId: string, status: 'free' | 'taken' | 'validated'): void {
    this.slots.update(slots => slots.map(s => s.id === slotId ? { ...s, status } : s));
  }

  toggleSlot(slot: TimeSlot): void {
    if (slot.status === 'validated') return;
    if (this.actionLoading()) return;

    const isSelected = this.selectedSlotIds().has(slot.id);
    this.actionLoading.set(slot.id);

    if (!isSelected && slot.status === 'free') {
      // Select
      this.api.post<{ message?: string; warnings?: string[] }>(`/sessions/${slot.sessionId}/slots/${slot.id}/select/${this.token}`, {}).subscribe({
        next: (res) => {
          this.selectedSlotIds.update(s => { const ns = new Set(s); ns.add(slot.id); return ns; });
          this.updateStatus(slot.id, 'taken');
          this.actionLoading.set('');
          for (const w of res.warnings ?? []) {
            this.toast.warning(w);
          }
          if (!res.warnings?.length) {
            this.toast.success(res.message ?? 'Créneau sélectionné');
          }
        },
        error: (e) => { this.toast.error(e.error?.error ?? 'Erreur'); this.actionLoading.set(''); },
      });
    } else if (isSelected) {
      // Deselect
      this.api.delete(`/sessions/${slot.sessionId}/slots/${slot.id}/select/${this.token}`).subscribe({
        next: () => {
          this.selectedSlotIds.update(s => { const ns = new Set(s); ns.delete(slot.id); return ns; });
          this.updateStatus(slot.id, 'free');
          this.actionLoading.set('');
        },
        error: (e) => { this.toast.error(e.error?.error ?? 'Erreur'); this.actionLoading.set(''); },
      });
    } else if (slot.status === 'taken') {
      this.actionLoading.set('');
      this.openContactModal(slot);
    }
  }

  openContactModal(slot: TimeSlot): void {
    this.contactTargetSlot.set(slot);
    this.contactMessage.set(
      `Bonjour,\n\nJe suis intéressé(e) par votre créneau ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}. Si possible, pouvez-vous le libérer pour une permutation ?\n\nMerci d'avance.`
    );
    this.contactModalOpen.set(true);
  }

  closeContactModal(): void {
    this.contactModalOpen.set(false);
    this.contactTargetSlot.set(null);
  }

  submitContactRequest(): void {
    const slot = this.contactTargetSlot();
    if (!slot) return;
    this.actionLoading.set(slot.id);
    this.api.post(`/sessions/${slot.sessionId}/slots/${slot.id}/contact/${this.token}`, { message: this.contactMessage() }).subscribe({
      next: () => {
        this.actionLoading.set('');
        this.closeContactModal();
        this.toast.success('Votre demande a été envoyée au professeur concerné.');
        this.loadContactRequests();
      },
      error: (e) => {
        this.actionLoading.set('');
        this.toast.error(e.error?.error ?? 'Erreur lors de l\'envoi.');
      },
    });
  }

  acceptRequest(requestId: string): void {
    this.actionLoading.set(requestId);
    this.api.post(`/sessions/${this.sessionId}/slots/contact-requests/${requestId}/accept/${this.token}`, {}).subscribe({
      next: () => {
        this.actionLoading.set('');
        this.toast.success('Demande acceptée. Créneau transféré.');
        this.loadSlots();
        this.loadContactRequests();
      },
      error: (e) => {
        this.actionLoading.set('');
        this.toast.error(e.error?.error ?? 'Impossible d\'accepter la demande.');
      },
    });
  }

  rejectRequest(requestId: string): void {
    this.actionLoading.set(requestId);
    this.api.post(`/sessions/${this.sessionId}/slots/contact-requests/${requestId}/reject/${this.token}`, {}).subscribe({
      next: () => {
        this.actionLoading.set('');
        this.toast.success('Demande refusée.');
        this.loadContactRequests();
      },
      error: (e) => {
        this.actionLoading.set('');
        this.toast.error(e.error?.error ?? 'Impossible de refuser la demande.');
      },
    });
  }

  days(): string[] {
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

  myCount(): number { return this.selectedSlotIds().size; }

  cardClass(slot: TimeSlot): string {
    const isOwn = this.selectedSlotIds().has(slot.id);
    if (slot.status === 'validated') return 'bg-steel/50 border-steel/70 text-navy/35 cursor-not-allowed';
    if (isOwn) return 'bg-brick/10 border-brick/35 text-brick cursor-pointer hover:bg-brick/15';
    if (slot.status === 'taken') return 'bg-navy/8 border-navy/20 text-navy/60 cursor-pointer hover:bg-navy/12';
    return 'bg-white border-steel text-navy cursor-pointer hover:border-brick/40 hover:bg-brick/5';
  }

  pendingIncomingCount(): number {
    return this.incomingRequests().filter(r => r.status === 'pending').length;
  }

  slotLabel(slot: TimeSlot): string {
    if (slot.status === 'validated') return 'Validé';
    if (this.selectedSlotIds().has(slot.id)) return 'Sélectionné';
    if (slot.status === 'taken') return 'Demander';
    return 'Libre';
  }
}
