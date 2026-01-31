import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';

export type QueueAccessStatus = 'ALLOWED' | 'WAITING';

export interface QueueStatusResponse {
  status: QueueAccessStatus;
  position?: number;
}

@Injectable({ providedIn: 'root' })
export class QueueService {
  private http = inject(HttpClient);
  private readonly baseUrl = (environment.queueApiUrl ?? environment.apiUrl).replace(/\/$/, '');
  private readonly storageKey = 'livrepass_queue_session_id';

  get sessionId(): string {
    let current = localStorage.getItem(this.storageKey);
    if (!current) {
      current = this.generateSessionId();
      localStorage.setItem(this.storageKey, current);
    }

    return current;
  }

  requestAccess(): Observable<QueueStatusResponse> {
    const params = new HttpParams().set('sessionId', this.sessionId);
    return this.http.get<QueueStatusResponse>(`${this.baseUrl}/access-check`, { params });
  }

  getQueueStatus(): Observable<QueueStatusResponse> {
    const headers = new HttpHeaders().set('X-Session-Id', this.sessionId);
    const params = new HttpParams().set('sessionId', this.sessionId);
    return this.http.get<QueueStatusResponse>(`${this.baseUrl}/queue-status`, { headers, params });
  }

  sendHeartbeat(): Observable<unknown> {
    const payload = { sessionId: this.sessionId };
    return this.http.post(`${this.baseUrl}/heartbeat`, payload);
  }

  clearSession(): void {
    localStorage.removeItem(this.storageKey);
  }

  private generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
