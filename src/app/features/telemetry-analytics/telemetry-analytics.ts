import { Component, input } from '@angular/core';
import { BioTelemetryRecord } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-telemetry-analytics',
  templateUrl: './telemetry-analytics.html',
  styleUrl: './telemetry-analytics.scss',
})
export class TelemetryAnalytics {
  public records = input.required<readonly BioTelemetryRecord[]>();
}
