import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelemetryFilterModel, SpeciesType } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-telemetry-filters',
  imports: [CommonModule, FormsModule],
  templateUrl: './telemetry-filters.html',
  styleUrl: './telemetry-filters.scss',
})
export class TelemetryFilters {
  public filterChange = output<TelemetryFilterModel>();

  // Stable Signals for Signal Form management & reactive state
  public species = signal<SpeciesType | 'ALL'>('ALL');
  public minHeartRate = signal<number>(40);
  public maxHeartRate = signal<number>(180);
  public liveStreamEnabled = signal<boolean>(true);

  public onSubmit(): void {
    this.filterChange.emit({
      species: this.species(),
      minHeartRate: this.minHeartRate(),
      maxHeartRate: this.maxHeartRate(),
      liveStreamEnabled: this.liveStreamEnabled(),
    });
  }
}
