import { Component, inject, signal, effect, AfterViewInit, DestroyRef } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap, catchError } from 'rxjs';
import { LeafletMapService } from '../../core/services/map.service';
import { TelemetryStreamService } from '../../core/services/stream.service';
import { BioTelemetryRecord, TelemetryFilterModel } from '../../core/models/telemetry.model';
import { TelemetryAnalytics } from '../telemetry-analytics/telemetry-analytics';
import { TelemetryFilters } from '../telemetry-filters/telemetry-filters';

@Component({
  selector: 'app-map-container',
  imports: [TelemetryAnalytics, TelemetryFilters],
  templateUrl: './map-container.html',
  styleUrl: './map-container.scss',
})
export class MapContainer implements AfterViewInit {
  private readonly mapService = inject(LeafletMapService);
  private readonly telemetryService = inject(TelemetryStreamService);
  private readonly destroyRef = inject(DestroyRef);

  // Mode switcher: 'mock' on initial load, or a specific study ID for live data
  public readonly dataSourceMode = signal<'mock' | string>('mock');

  public selectedStudyId: string = '7006760';

  onStudyChange(event: any) {
    this.selectedStudyId = event.target.value;
  }

  // Reactive stream that switches between local mock and live API based on dataSourceMode signal
  private readonly rawTelemetryRecords = toSignal(
    toObservable(this.dataSourceMode).pipe(
      switchMap((mode) => {
        if (mode === 'mock') {
          return this.telemetryService.getLocalMockTelemetry();
        } else {
          return this.telemetryService.getLiveTelemetry(mode);
        }
      }),
      catchError(() => of([] as BioTelemetryRecord[])),
    ),
    { initialValue: [] as BioTelemetryRecord[] },
  );

  public readonly filters = signal<TelemetryFilterModel>({
    species: 'ALL',
    minHeartRate: 20,
    maxHeartRate: 220,
    liveStreamEnabled: true,
  });

  public readonly filteredRecords = signal<BioTelemetryRecord[]>([]);

  constructor() {
    effect(() => {
      const records = this.rawTelemetryRecords();
      const currentFilters = this.filters();

      if (!currentFilters.liveStreamEnabled) {
        this.filteredRecords.set([]);
        return;
      }

      const processed = records.filter((record) => {
        const matchesSpecies =
          currentFilters.species === 'ALL' || record.species === currentFilters.species;
        const matchesHR =
          record.telemetry.heartRateBpm >= currentFilters.minHeartRate &&
          record.telemetry.heartRateBpm <= currentFilters.maxHeartRate;
        return matchesSpecies && matchesHR;
      });

      this.filteredRecords.set(processed);
    });

    effect(() => {
      const activePoints = this.filteredRecords();
      this.mapService.renderTelemetryPoints(activePoints);
    });
  }

  public ngAfterViewInit(): void {
    this.mapService.initializeMap('leaflet-spatial-canvas', [15.0, 10.0], 3);

    this.destroyRef.onDestroy(() => {
      this.mapService.disposeMap();
    });
  }

  public onFilterUpdated(newFilters: TelemetryFilterModel): void {
    this.filters.set(newFilters);
  }

  // Method triggered by user action in UI to switch to live data from Cloudflare Worker
  public switchToLiveDataset(studyId: string): void {
    this.dataSourceMode.set(studyId);
  }

  // Method to revert back to local mock data
  public switchToMockDataset(): void {
    this.dataSourceMode.set('mock');
  }
}
