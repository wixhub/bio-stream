import {
  Component,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeafletMapService } from '../../core/services/map.service';
import { TelemetryStreamService } from '../../core/services/stream.service';
import { TelemetryFilters } from '../telemetry-filters/telemetry-filters';
import { TelemetryAnalytics } from '../telemetry-analytics/telemetry-analytics';
import { TelemetryFilterModel } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-map-container',
  imports: [CommonModule, TelemetryFilters, TelemetryAnalytics],
  templateUrl: './map-container.html',
  styleUrl: './map-container.scss',
})
export class MapContainer implements AfterViewInit {
  private mapService = inject(LeafletMapService);
  private telemetryStreamService = inject(TelemetryStreamService);

  // Bridge high-frequency RxJS telemetry stream into Angular Signals via toSignal
  private rawTelemetry = toSignal(this.telemetryStreamService.telemetryStream$, {
    initialValue: [],
  });

  // Filter Signal state
  public filters = signal<TelemetryFilterModel>({
    species: 'ALL',
    minHeartRate: 20,
    maxHeartRate: 220,
    liveStreamEnabled: true,
  });

  // Computed state combining telemetry stream with reactive filters
  public filteredRecords = computed(() => {
    const data = this.rawTelemetry();
    const currentFilter = this.filters();

    if (!currentFilter.liveStreamEnabled) return [];

    return data.filter((record) => {
      const speciesMatch =
        currentFilter.species === 'ALL' || record.species === currentFilter.species;
      const hrMatch =
        record.telemetry.heartRateBpm >= currentFilter.minHeartRate &&
        record.telemetry.heartRateBpm <= currentFilter.maxHeartRate;
      return speciesMatch && hrMatch;
    });
  });

  constructor() {
    // Effect handling declarative map rendering synchronization with computed signal outputs
    effect(() => {
      const records = this.filteredRecords();
      this.mapService.renderTelemetryPoints(records);
    });
  }

  public ngAfterViewInit(): void {
    this.mapService.initializeMap('leaflet-spatial-canvas', [15.0, 10.0], 3);
  }

  public onFilterUpdated(newFilters: TelemetryFilterModel): void {
    this.filters.set(newFilters);
  }
}
