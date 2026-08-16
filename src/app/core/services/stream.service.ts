// src/app/core/services/telemetry-stream.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, map, shareReplay, startWith, switchMap } from 'rxjs';
import { BioTelemetryRecord } from '../models/telemetry.model';

@Injectable({
  providedIn: 'root',
})
export class TelemetryStreamService {
  private http = inject(HttpClient);

  // High-frequency reactive stream simulating websocket telemetry ingestion
  public readonly telemetryStream$: Observable<readonly BioTelemetryRecord[]> = interval(4000).pipe(
    startWith(0),
    switchMap(() => this.http.get<readonly BioTelemetryRecord[]>('/data/telemetry-mock.json')),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
