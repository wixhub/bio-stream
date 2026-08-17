import { Component, output, signal } from '@angular/core';
import { TelemetryFilterModel, SpeciesType } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-telemetry-filters',
  templateUrl: './telemetry-filters.html',
  styleUrl: './telemetry-filters.scss',
})
export class TelemetryFilters {
  public readonly filterChange = output<TelemetryFilterModel>();

  // Stable Signals for reactive state management
  public readonly species = signal<SpeciesType | 'ALL'>('ALL');
  public readonly minHeartRate = signal<number>(40);
  public readonly maxHeartRate = signal<number>(180);
  public readonly liveStreamEnabled = signal<boolean>(true);

  // Methods for handling native event bindings safely
  public onSpeciesChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as SpeciesType | 'ALL';
    this.species.set(value);
    this.emitChanges();
  }

  public onMinHeartRateChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.minHeartRate.set(value);
    this.emitChanges();
  }

  public onMaxHeartRateChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.maxHeartRate.set(value);
    this.emitChanges();
  }

  public onLiveStreamChange(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.liveStreamEnabled.set(value);
    this.emitChanges();
  }

  private emitChanges(): void {
    this.filterChange.emit({
      species: this.species(),
      minHeartRate: this.minHeartRate(),
      maxHeartRate: this.maxHeartRate(),
      liveStreamEnabled: this.liveStreamEnabled(),
    });
  }
}
