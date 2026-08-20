import {
  Component,
  inject,
  signal,
  effect,
  AfterViewInit,
  DestroyRef,
  ChangeDetectorRef,
} from '@angular/core';
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
  protected readonly telemetryService = inject(TelemetryStreamService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cd = inject(ChangeDetectorRef);

  // Input model for custom study ID entry in the template
  public selectedStudyId: string = '7006760';

  // State signal to manage error notifications with a 12-second timeout
  public readonly errorMessage = signal<string | null>(null);
  private errorTimeoutId: any = null;

  public readonly filters = signal<TelemetryFilterModel>({
    species: 'ALL',
    minHeartRate: 20,
    maxHeartRate: 220,
    liveStreamEnabled: true,
  });

  public readonly filteredRecords = signal<BioTelemetryRecord[]>([]);

  constructor() {
    // Monitor live stream resources and trigger persistent error banners if upstream failures occur
    effect(() => {
      const liveError = this.telemetryService.liveTelemetryResource.error();
      const isMockActive = this.telemetryService.useMockFallback();

      if (liveError && !isMockActive) {
        this.showAutoClosingError(
          `Failed to load live telemetry stream for Study ID "${this.telemetryService.selectedStudyId()}". Reverting to local mock dataset.`,
        );
      }
    });

    // Core effect to process records and apply active filters
    effect(() => {
      const records = this.telemetryService.telemetryRecords();
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

    // Effect to update map visualization markers whenever filtered records change
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

  /**
   * Displays an inline error message that automatically hides after 12 seconds.
   */
  private showAutoClosingError(message: string): void {
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
    }

    this.errorMessage.set(message);
    this.cd.markForCheck();

    this.errorTimeoutId = setTimeout(() => {
      this.errorMessage.set(null);
      this.cd.markForCheck();
    }, 12000);
  }

  /**
   * Manually dismisses the error banner.
   */
  public dismissError(): void {
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
    this.errorMessage.set(null);
    this.cd.markForCheck();
  }

  public onStudyChange(event: any): void {
    this.selectedStudyId = event.target.value;
  }

  public onFilterUpdated(newFilters: TelemetryFilterModel): void {
    this.filters.set(newFilters);
  }

  /**
   * Switches data source to live Cloudflare Worker proxy stream for the given study ID.
   */
  public switchToLiveDataset(studyId: string): void {
    this.dismissError();
    this.telemetryService.setStudyId(studyId);
  }

  /**
   * Manually forces fallback to local static mock data.
   */
  public switchToMockDataset(): void {
    this.dismissError();
    this.telemetryService.activateMockFallback();
  }
}
