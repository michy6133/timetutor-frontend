import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';

interface SlotSelectedEvent { slotId: string; teacherName: string; status: string; }
interface SlotReleasedEvent { slotId: string; }
interface SlotValidatedEvent { slotId: string; }

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  private slotSelected$ = new Subject<SlotSelectedEvent>();
  private slotReleased$ = new Subject<SlotReleasedEvent>();
  private slotValidated$ = new Subject<SlotValidatedEvent>();

  connect(token?: string): void {
    if (this.socket?.connected) return;
    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket.on('slot-selected', (data: SlotSelectedEvent) => this.slotSelected$.next(data));
    this.socket.on('slot-released', (data: SlotReleasedEvent) => this.slotReleased$.next(data));
    this.socket.on('slot-validated', (data: SlotValidatedEvent) => this.slotValidated$.next(data));
  }

  joinSession(sessionId: string): void {
    this.socket?.emit('join-session', sessionId);
  }

  onSlotSelected(): Observable<SlotSelectedEvent> { return this.slotSelected$.asObservable(); }
  onSlotReleased(): Observable<SlotReleasedEvent> { return this.slotReleased$.asObservable(); }
  onSlotValidated(): Observable<SlotValidatedEvent> { return this.slotValidated$.asObservable(); }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
