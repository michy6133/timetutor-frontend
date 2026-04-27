import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { SocketService } from '../../../../core/services/socket.service';

interface DirectorNegotiationRow {
  id: string;
  status: 'active' | 'locked' | 'cancelled';
  lockedAt: string | null;
  targetSlotId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  ownerName: string | null;
  participantsCount: number;
  pendingRequesters: number;
}

interface DirectorFreeSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
}

@Component({
  selector: 'app-session-negotiation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './session-negotiation.component.html',
})
export class SessionNegotiationComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly socket = inject(SocketService);

  readonly loading = signal(true);
  readonly negotiations = signal<DirectorNegotiationRow[]>([]);
  readonly freeSlots = signal<DirectorFreeSlot[]>([]);

  sessionId = '';

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.params['id'];
    this.refresh();
    this.socket.connect();
    this.socket.joinSession(this.sessionId);
    this.socket.onNegotiationUpdated().subscribe(() => this.refresh());
    this.socket.onSlotSelected().subscribe(() => this.refresh());
    this.socket.onSlotReleased().subscribe(() => this.refresh());
    this.socket.onSlotLocked().subscribe(() => this.refresh());
  }

  refresh(): void {
    this.loading.set(true);
    this.api.get<{ negotiations: DirectorNegotiationRow[]; freeSlots: DirectorFreeSlot[] }>(
      `/sessions/${this.sessionId}/slots/negotiations`
    ).subscribe({
      next: (payload) => {
        this.negotiations.set(payload.negotiations);
        this.freeSlots.set(payload.freeSlots);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
