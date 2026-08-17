import { TestBed } from '@angular/core/testing';
import { LeafletMapService } from './map.service';
import { BioTelemetryRecord } from '../models/telemetry.model';
import * as L from 'leaflet';

// Mock Leaflet methods to avoid actual DOM canvas/map container initialization issues in headless test runner
vi.mock('leaflet', async () => {
  const actual = await vi.importActual<typeof L>('leaflet');
  return {
    ...actual,
    map: vi.fn().mockReturnValue({
      setView: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    }),
    tileLayer: vi.fn().mockReturnValue({
      addTo: vi.fn(),
    }),
    layerGroup: vi.fn().mockReturnValue({
      addTo: vi.fn(),
      clearLayers: vi.fn(),
      addLayer: vi.fn(),
    }),
    circleMarker: vi.fn().mockReturnValue({
      bindPopup: vi.fn().mockReturnThis(),
    }),
    polyline: vi.fn().mockReturnValue({}),
  };
});

describe('LeafletMapService', () => {
  let service: LeafletMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LeafletMapService],
    });
    service = TestBed.inject(LeafletMapService);
  });

  it('should be created successfully', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeMap', () => {
    it('should initialize the Leaflet map instance with provided container and options', () => {
      // Act
      service.initializeMap('map-container', [10, 20], 5);

      // Assert
      expect(L.map).toHaveBeenCalledWith('map-container', {
        zoomControl: false,
        attributionControl: false,
      });
    });

    it('should not re-initialize the map if it already exists', () => {
      // Act
      service.initializeMap('map-container');
      service.initializeMap('map-container');

      // Assert - should only be called once due to early return guard
      expect(L.map).toHaveBeenCalledTimes(1);
    });
  });

  describe('renderTelemetryPoints', () => {
    it('should clear existing layers and render new markers and polyline for valid telemetry records', () => {
      // Arrange
      service.initializeMap('map-container');

      const mockRecords: BioTelemetryRecord[] = [
        {
          id: 'rec-1',
          subjectId: 'sub-1',
          species: 'AVIAN_MIGRATORY',
          timestamp: new Date().toISOString(),
          coordinates: { lat: 10, lng: 20, elevationMeters: 100 },
          telemetry: {
            heartRateBpm: 120,
            bodyTemperatureC: 38.5,
            activityLevelIndex: 0.8,
          },
        },
        {
          id: 'rec-2',
          subjectId: 'sub-2',
          species: 'MARINE_CETACEAN',
          timestamp: new Date().toISOString(),
          coordinates: { lat: 15, lng: 25 },
          telemetry: {
            heartRateBpm: 60,
            bodyTemperatureC: 36.2,
            activityLevelIndex: 0.3,
          },
        },
      ];

      // Act
      service.renderTelemetryPoints(mockRecords);

      // Assert
      expect(L.circleMarker).toHaveBeenCalledTimes(2);
      expect(L.polyline).toHaveBeenCalledTimes(1);
    });

    it('should not render polylines if there is 1 or fewer telemetry records', () => {
      // Arrange
      service.initializeMap('map-container');

      const mockRecords: BioTelemetryRecord[] = [
        {
          id: 'rec-1',
          subjectId: 'sub-1',
          species: 'TERRESTRIAL_UNGULATE',
          timestamp: new Date().toISOString(),
          coordinates: { lat: 10, lng: 20 },
          telemetry: {
            heartRateBpm: 90,
            bodyTemperatureC: 37.9,
            activityLevelIndex: 0.5,
          },
        },
      ];

      // Act
      service.renderTelemetryPoints(mockRecords);

      // Assert
      expect(L.circleMarker).toHaveBeenCalledTimes(1);
      expect(L.polyline).not.toHaveBeenCalled();
    });
  });

  describe('disposeMap', () => {
    it('should remove the map instance if it is currently active', () => {
      // Arrange
      service.initializeMap('map-container');

      // Act
      service.disposeMap();

      // Assert - verify internal map instance is cleaned up safely
      expect(service['mapInstance']).toBeNull();
    });
  });
});
