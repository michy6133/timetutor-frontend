import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  DestroyRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../core/services/toast.service';
import type { TimeSlot } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../../shared/svg-icon.component';
import { OnboardingService } from '../../../shared/onboarding.service';
import { OnboardingOverlayComponent, type OnboardingStep } from '../../../shared/onboarding-overlay.component';

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

interface NegotiationItem {
  id: string;
  sessionId: string;
  targetSlotId: string;
  status: 'active' | 'locked' | 'cancelled';
  lockedAt: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  ownerName: string | null;
}

interface NegotiationParticipant {
  negotiationId: string;
  teacherId: string;
  teacherName: string;
  role: 'owner' | 'requester';
  resolved: boolean;
  desiredSlotId: string | null;
}

interface NegotiationFreeSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
}

interface NegotiationsResponse {
  negotiations: NegotiationItem[];
  participants: NegotiationParticipant[];
  freeSlots: NegotiationFreeSlot[];
}

interface GlobalScheduleRow {
  slotId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  status: string;
  sessionId: string;
  sessionName: string;
  academicYear: string;
  schoolName: string;
  subjectName: string | null;
}

@Component({
  selector: 'app-slot-picker',
  standalone: true,
  imports: [CommonModule, SvgIconComponent, OnboardingOverlayComponent],
  templateUrl: './slot-picker.component.html',
  /** Page très interactive + lien magique : évite les clics « morts » avec withEventReplay (hydratation). */
  host: { ngSkipHydration: '' },
})
export class SlotPickerComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly onboarding = inject(OnboardingService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly teacher = signal<TeacherInfo | null>(null);
  readonly session = signal<SessionInfo | null>(null);
  readonly slots = signal<TimeSlot[]>([]);
  readonly actionLoading = signal<string>('');
  readonly contactModalOpen = signal(false);
  readonly contactTargetSlot = signal<TimeSlot | null>(null);
  readonly contactMessage = signal('');
  readonly incomingRequests = signal<ContactIncomingRequest[]>([]);
  readonly outgoingRequests = signal<ContactOutgoingRequest[]>([]);
  readonly pendingIncomingCount = computed(() => this.incomingRequests().filter(r => r.status === 'pending').length);
  readonly negotiations = signal<NegotiationItem[]>([]);
  readonly negotiationParticipants = signal<NegotiationParticipant[]>([]);
  readonly negotiationFreeSlots = signal<NegotiationFreeSlot[]>([]);
  readonly globalSchedule = signal<GlobalScheduleRow[]>([]);
  readonly showOnboarding = signal(false);
  readonly showConflictGuide = signal(false);

  readonly onboardingSteps: OnboardingStep[] = [
    {
      selector: '[data-tour="teacher-count"]',
      title: 'Vos créneaux sélectionnés',
      text: 'Ce compteur indique combien de créneaux vous avez déjà réservés dans cette session.',
      position: 'left',
    },
    {
      selector: '[data-tour="teacher-grid"]',
      title: 'Grille horaire',
      text: 'Cliquez sur un créneau libre (blanc) pour le sélectionner. Cliquez à nouveau pour le libérer. Vos choix sont sauvegardés en temps réel.',
      position: 'top',
    },
    {
      selector: '[data-tour="teacher-exchanges"]',
      title: 'Demandes d\'échange',
      text: 'Un créneau vous intéresse mais il est pris ? Cliquez dessus pour envoyer une demande d\'échange au collègue concerné.',
      position: 'bottom',
    },
    {
      selector: '[data-tour="teacher-global"]',
      title: 'Calendrier global',
      text: 'Retrouvez ici tous vos créneaux confirmés sur l\'ensemble de vos écoles. Téléchargez-les en format .ics pour les importer dans votre agenda.',
      position: 'top',
    },
  ];

  private token = '';
  private sessionId = '';
  private myTeacherId = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    this.api.get<VerifyResponse>(`/teachers/verify/${this.token}`).subscribe({
      next: (res) => {
        this.myTeacherId = res.teacherId;
        this.teacher.set(res.teacher);
        this.session.set(res.session);
        this.sessionId = res.sessionId;
        this.myTeacherId = res.teacherId;
        this.loadSlots();
        this.loadContactRequests();
        this.loadNegotiations();
        this.loadGlobalSchedule();
        if (!this.onboarding.isDone('teacher')) {
          this.showOnboarding.set(true);
        }
        this.socket.connect();
        this.socket.joinSession(this.sessionId);
        this.socket.onSlotSelected().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadSlots());
        this.socket.onSlotReleased().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadSlots());
        this.socket.onSlotValidated().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadSlots());
        this.socket.onSlotLocked().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadSlots());
        this.socket.onContactRequestsChanged().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadContactRequests());
        this.socket.onNegotiationUpdated().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadNegotiations());
        this.socket.onContactRequest().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadNegotiations());

        interval(12000)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            if (!this.sessionId || !this.token) return;
            this.loadSlots();
            this.loadContactRequests();
            this.loadNegotiations();
            this.loadGlobalSchedule();
          });
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

  dismissOnboarding(): void {
    this.onboarding.markDone('teacher');
    this.showOnboarding.set(false);
  }

  /** Créneaux réellement attribués à cet enseignant (pas « tout créneau pris »). */
  ownsSlot(slot: TimeSlot): boolean {
    return !!this.myTeacherId && slot.selectedByTeacherId === this.myTeacherId;
  }

  loadSlots(): void {
    this.api.get<TimeSlot[]>(`/sessions/${this.sessionId}/slots/teacher/${this.token}`).subscribe({
      next: (slots) => {
        this.slots.set(this.normalizeSlotsFromApi(slots));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Affiche « pris » dès qu’une sélection existe, même si `time_slots.status` était désynchronisé. */
  private normalizeSlotsFromApi(slots: TimeSlot[]): TimeSlot[] {
    return slots.map((s) => {
      if (s.status === 'validated' || s.status === 'locked') return s;
      if (s.selectedByTeacherId || s.status === 'taken') {
        return { ...s, status: 'taken' };
      }
      return { ...s, status: 'free' };
    });
  }

  loadNegotiations(): void {
    this.api.get<NegotiationsResponse>(`/sessions/${this.sessionId}/slots/negotiations/${this.token}`).subscribe({
      next: (payload) => {
        this.negotiations.set(payload.negotiations);
        this.negotiationParticipants.set(payload.participants);
        this.negotiationFreeSlots.set(payload.freeSlots);
      },
      error: () => undefined,
    });
  }

  loadGlobalSchedule(): void {
    this.api.get<GlobalScheduleRow[]>(`/teachers/my-schedule/${this.token}`).subscribe({
      next: (rows) => this.globalSchedule.set(rows),
      error: () => this.globalSchedule.set([]),
    });
  }

  globalScheduleDays(): string[] {
    const order = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const seen = new Set(this.globalSchedule().map((r) => r.dayOfWeek));
    return order.filter((d) => seen.has(d));
  }

  globalForDay(day: string): GlobalScheduleRow[] {
    return this.globalSchedule()
      .filter((r) => r.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
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

  echangeAnchorHref(): string {
    return this.token ? `/teacher/${this.token}#echange-section` : '/#echange-section';
  }

  /** Scroll vers #echange-section. Si Angular n'accroche pas le click, le href fait le fallback. */
  scrollToEchangeSection(event?: Event): void {
    event?.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;

    const HEADER_STICKY_OFFSET_PX = 100;
    const doScroll = (): boolean => {
      const el = document.getElementById('echange-section');
      if (!el) return false;
      const y = el.getBoundingClientRect().top + window.scrollY - HEADER_STICKY_OFFSET_PX;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      return true;
    };

    if (doScroll()) return;
    requestAnimationFrame(() => {
      if (doScroll()) return;
      setTimeout(() => {
        if (!doScroll()) {
          this.toast.info('Section échanges introuvable. Rechargez la page.');
        }
      }, 120);
    });
  }

  toggleSlot(slot: TimeSlot): void {
    if (slot.status === 'validated' || slot.status === 'locked') return;
    if (this.actionLoading()) return;

    if (this.ownsSlot(slot)) {
      this.actionLoading.set(slot.id);
      this.api.delete(`/sessions/${slot.sessionId}/slots/${slot.id}/select/${this.token}`).subscribe({
        next: () => {
          this.patchSlot(slot.id, {
            status: 'free',
            selectedByTeacherId: undefined,
            teacherName: undefined,
          });
          this.actionLoading.set('');
          this.toast.success('Créneau libéré');
        },
        error: (e) => {
          this.toast.error(e.error?.error ?? 'Erreur');
          this.actionLoading.set('');
          this.loadSlots();
        },
      });
      return;
    }

    if (slot.status === 'free') {
      this.actionLoading.set(slot.id);
      this.api.post<{ message?: string; warnings?: string[] }>(
        `/sessions/${slot.sessionId}/slots/${slot.id}/select/${this.token}`,
        {}
      ).subscribe({
        next: (res) => {
          this.patchSlot(slot.id, {
            status: 'taken',
            selectedByTeacherId: this.myTeacherId,
            teacherName: this.teacher()?.fullName ?? undefined,
          });
          this.actionLoading.set('');
          for (const w of res.warnings ?? []) {
            this.toast.warning(w);
          }
          if (!res.warnings?.length) {
            this.toast.success(res.message ?? 'Créneau sélectionné');
          }
        },
        error: (e) => {
          this.toast.error(e.error?.error ?? 'Erreur');
          this.actionLoading.set('');
          this.loadSlots();
          this.loadContactRequests();
        },
      });
      return;
    }

    if (slot.status === 'taken') {
      this.openContactModal(slot);
    }
  }

  private patchSlot(slotId: string, patch: Partial<TimeSlot>): void {
    this.slots.update((slots) => slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)));
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

  participantsForNegotiation(negotiationId: string): NegotiationParticipant[] {
    return this.negotiationParticipants().filter((p) => p.negotiationId === negotiationId);
  }

  chooseFreeSlot(negotiationId: string, slotId: string): void {
    this.actionLoading.set(`${negotiationId}:${slotId}`);
    this.api.post<{ message: string; locked: boolean }>(
      `/sessions/${this.sessionId}/slots/negotiations/${negotiationId}/choose/${this.token}`,
      { slotId }
    ).subscribe({
      next: (res) => {
        this.actionLoading.set('');
        this.toast.success(res.message);
        this.loadSlots();
        this.loadNegotiations();
      },
      error: (e) => {
        this.actionLoading.set('');
        this.toast.error(e.error?.error ?? 'Choix impossible');
        this.loadSlots();
        this.loadNegotiations();
      },
    });
  }

  isChoosing(negotiationId: string, slotId: string): boolean {
    return this.actionLoading() === `${negotiationId}:${slotId}`;
  }

  downloadCalendar(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const rows = this.globalSchedule();
    if (!rows.length) { this.toast.info('Aucun créneau à exporter.'); return; }

    const dayOffset: Record<string, number> = { Lundi: 0, Mardi: 1, Mercredi: 2, Jeudi: 3, Vendredi: 4, Samedi: 5 };
    const dayByday: Record<string, string> = { Lundi: 'MO', Mardi: 'TU', Mercredi: 'WE', Jeudi: 'TH', Vendredi: 'FR', Samedi: 'SA' };

    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);

    const fmt = (base: Date, offset: number, h: number, m: number): string => {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}${mo}${da}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    };

    const esc = (s: string) => s.replace(/[,;\\]/g, (c) => '\\' + c);
    const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TimeTutor//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

    for (const row of rows) {
      const offset = dayOffset[row.dayOfWeek] ?? 0;
      const [sh, sm] = row.startTime.slice(0, 5).split(':').map(Number);
      const [eh, em] = row.endTime.slice(0, 5).split(':').map(Number);
      const summary = row.subjectName ? `${row.subjectName} — ${row.schoolName}` : `${row.sessionName} — ${row.schoolName}`;
      lines.push('BEGIN:VEVENT',
        `UID:${row.slotId}@timetutor.app`,
        `DTSTART:${fmt(monday, offset, sh, sm)}`,
        `DTEND:${fmt(monday, offset, eh, em)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${dayByday[row.dayOfWeek] ?? 'MO'}`,
        `SUMMARY:${esc(summary)}`,
        `DESCRIPTION:Session : ${esc(row.sessionName)}\\nÉcole : ${esc(row.schoolName)}`,
        'END:VEVENT');
    }
    lines.push('END:VCALENDAR');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'calendrier-timetutor.ics'; a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Calendrier .ics téléchargé.');
  }

  copySessionLink(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(window.location.href).then(
      () => this.toast.success('Lien copié dans le presse-papiers.'),
      () => this.toast.error('Impossible de copier le lien.')
    );
  }

  requestStatusClass(status: string): string {
    if (status === 'accepted') return 'bg-emerald/15 text-emerald';
    if (status === 'rejected' || status === 'cancelled') return 'bg-steel/60 text-navy/40';
    return 'bg-jasmine/20 text-navy/60';
  }

  requestStatusLabel(status: string): string {
    if (status === 'accepted') return 'Accepté';
    if (status === 'rejected') return 'Refusé';
    if (status === 'cancelled') return 'Annulé';
    return 'En attente';
  }

  days(): string[] {
    const order = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return order.filter((d) => this.slots().some((s) => s.dayOfWeek === d));
  }

  uniqueTimes(): { start: string; end: string }[] {
    const seen = new Set<string>();
    const times: { start: string; end: string }[] = [];
    for (const slot of this.slots()) {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!seen.has(key)) {
        seen.add(key);
        times.push({ start: slot.startTime, end: slot.endTime });
      }
    }
    return times.sort((a, b) => a.start.localeCompare(b.start));
  }

  getSlot(day: string, startTime: string): TimeSlot | null {
    return this.slots().find((s) => s.dayOfWeek === day && s.startTime === startTime) ?? null;
  }

  myCount(): number {
    return this.slots().filter((s) => this.ownsSlot(s)).length;
  }

  cardClass(slot: TimeSlot): string {
    if (slot.status === 'validated') return 'bg-steel/60 border-steel/80 text-navy/40 cursor-not-allowed';
    if (slot.status === 'locked') return 'bg-steel/70 border-steel/90 text-navy/45 cursor-not-allowed';
    if (this.ownsSlot(slot)) return 'bg-brick/10 border-brick/35 text-navy cursor-pointer hover:bg-brick/18';
    if (slot.status === 'taken') return 'bg-mahogany/12 border-mahogany/35 text-mahogany cursor-pointer hover:bg-mahogany/20';
    return 'bg-white border-steel/50 text-navy cursor-pointer hover:border-emerald/40 hover:bg-emerald/6';
  }

  slotLabel(slot: TimeSlot): string {
    if (slot.status === 'validated') return 'Validé';
    if (slot.status === 'locked') return 'Verrouillé';
    if (this.ownsSlot(slot)) return 'Sélectionné';
    if (slot.status === 'taken') return 'Échanger';
    return 'Libre';
  }
}
