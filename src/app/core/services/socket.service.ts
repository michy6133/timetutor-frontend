import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';

interface SlotSelectedEvent { slotId: string; teacherName: string; status: string; }
interface SlotReleasedEvent { slotId: string; }
interface SlotValidatedEvent { slotId: string; }
interface SlotLockedEvent { slotId: string; }
interface NegotiationUpdatedEvent { sessionId: string; negotiationId: string; }
interface ContactRequestEvent { slotId: string; requesterName: string; }

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private socket: Socket | null = null;

  private slotSelected$ = new Subject<SlotSelectedEvent>();
  private slotReleased$ = new Subject<SlotReleasedEvent>();
  private slotValidated$ = new Subject<SlotValidatedEvent>();
  private slotLocked$ = new Subject<SlotLockedEvent>();
  private contactRequestsChanged$ = new Subject<void>();
  private negotiationUpdated$ = new Subject<NegotiationUpdatedEvent>();
  private contactRequest$ = new Subject<ContactRequestEvent>();

  connect(token?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.socket?.connected) return;
    this.socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket.on('slot-selected', (data: SlotSelectedEvent) => this.slotSelected$.next(data));
    this.socket.on('slot-released', (data: SlotReleasedEvent) => this.slotReleased$.next(data));
    this.socket.on('slot-validated', (data: SlotValidatedEvent) => this.slotValidated$.next(data));
    this.socket.on('slot-locked', (data: SlotLockedEvent) => this.slotLocked$.next(data));
    this.socket.on('contact-requests-changed', () => this.contactRequestsChanged$.next());
    this.socket.on('negotiation-updated', (data: NegotiationUpdatedEvent) => this.negotiationUpdated$.next(data));
    this.socket.on('contact-request', (data: ContactRequestEvent) => this.contactRequest$.next(data));
  }

  joinSession(sessionId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.socket?.emit('join-session', sessionId);
  }

  onSlotSelected(): Observable<SlotSelectedEvent> { return this.slotSelected$.asObservable(); }
  onSlotReleased(): Observable<SlotReleasedEvent> { return this.slotReleased$.asObservable(); }
  onSlotValidated(): Observable<SlotValidatedEvent> { return this.slotValidated$.asObservable(); }
  onSlotLocked(): Observable<SlotLockedEvent> { return this.slotLocked$.asObservable(); }
  onContactRequestsChanged(): Observable<void> { return this.contactRequestsChanged$.asObservable(); }
  onNegotiationUpdated(): Observable<NegotiationUpdatedEvent> { return this.negotiationUpdated$.asObservable(); }
  onContactRequest(): Observable<ContactRequestEvent> { return this.contactRequest$.asObservable(); }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
