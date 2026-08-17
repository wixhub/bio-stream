import { TestBed } from '@angular/core/testing';
import { TelemetryAnalytics } from './telemetry-analytics';
import { BioTelemetryRecord } from '../../core/models/telemetry.model';

describe('TelemetryAnalytics', () => {
  let component: TelemetryAnalytics;
  let fixture: any;

  const mockRecords: BioTelemetryRecord[] = [
    {
      id: 'rec-1',
      subjectId: 'sub-1',
      species: 'AVIAN_MIGRATORY',
      timestamp: new Date().toISOString(),
      coordinates: { lat: 10, lng: 20 },
      telemetry: {
        heartRateBpm: 120,
        bodyTemperatureC: 38.0,
        activityLevelIndex: 0.8,
      },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelemetryAnalytics],
    }).compileComponents();

    fixture = TestBed.createComponent(TelemetryAnalytics);
    component = fixture.componentInstance;
  });

  it('should create the component successfully', () => {
    // Assert
    expect(component).toBeTruthy();
  });

  it('should correctly accept records via the required input signal', () => {
    // Arrange & Act
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    // Assert
    expect(component.records()).toEqual(mockRecords);
    expect(component.records().length).toBe(1);
  });
});
