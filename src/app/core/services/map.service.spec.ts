import { TestBed } from '@angular/core/testing';
import { LeafletMapService } from './map.service';
import { BioTelemetryRecord } from '../models/telemetry.model';

describe('LeafletMapService', () => {
  let service: LeafletMapService;
  let container: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LeafletMapService],
    });

    service = TestBed.inject(LeafletMapService);

    // Create a mock DOM element container for Leaflet map mounting
    container = document.createElement('div');
    container.id = 'map';
    document.body.appendChild(container);
  });

  afterEach(() => {
    service.disposeMap();
    container.remove();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize map instance successfully inside container', () => {
    service.initializeMap('map', [10, 20], 5);
    // Verify service handles initialization cleanly without throwing errors
    expect(service).toBeTruthy();
  });

  it('should render telemetry markers and vector polylines', () => {
    service.initializeMap('map');

    const mockRecords: BioTelemetryRecord[] = [
      {
        id: '1',
        subjectId: 'Seal-1',
        species: 'MARINE_CETACEAN',
        timestamp: '2026-06-01T12:00:00Z',
        coordinates: { lat: 35.0, lng: -120.0 },
        telemetry: { heartRateBpm: 80, bodyTemperatureC: 38, activityLevelIndex: 0.5 },
      },
      {
        id: '2',
        subjectId: 'Seal-2',
        species: 'MARINE_CETACEAN',
        timestamp: '2026-06-01T13:00:00Z',
        coordinates: { lat: 36.0, lng: -121.0 },
        telemetry: { heartRateBpm: 82, bodyTemperatureC: 38, activityLevelIndex: 0.6 },
      },
    ];

    expect(() => service.renderTelemetryPoints(mockRecords)).not.toThrow();
  });
});
