import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BioTelemetryRecord } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-telemetry-analytics',
  imports: [CommonModule],
  templateUrl: './telemetry-analytics.html',
  styleUrl: './telemetry-analytics.scss',
})
export class TelemetryAnalytics {
  public records = input.required<readonly BioTelemetryRecord[]>();
}
