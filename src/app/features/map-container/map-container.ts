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

  // Signal for custom study ID entry defaulting to the active Albatrosses dataset
  public readonly selectedStudyId = signal<string>('2911040');

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
    // Monitor live stream errors or empty results and trigger informative banners
    effect(() => {
      const liveError = this.telemetryService.liveError();
      const currentId = this.selectedStudyId();

      // If a custom ID fails, inform the user that we fell back to default albatrosses (2911040)
      if (liveError) {
        if (currentId == '2911040') {
          this.showAutoClosingError(
            `Study ID "${currentId}" returned no data or failed. Please check your internet connection or try again later.`,
          );
        } else {
          this.selectedStudyId.set('2911040');
          this.switchToLiveDataset('2911040');
          this.showAutoClosingError(
            `Study ID "${currentId}" returned no data or failed. Reverting back to default Galapagos Albatrosses (2911040). Verify the ID or check API limits.`,
          );
        }
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

    // Automatically fetch default active albatrosses data on startup
    this.telemetryService.setStudyId('2911040');

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

  public onStudyChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedStudyId.set(input.value);
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
}
