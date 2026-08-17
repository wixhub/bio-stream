import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MapContainer } from './map-container';
import { LeafletMapService } from '../../core/services/map.service';
import { TelemetryStreamService } from '../../core/services/stream.service';
import { BioTelemetryRecord, TelemetryFilterModel } from '../../core/models/telemetry.model';

describe('MapContainer', () => {
  let component: MapContainer;
  let mapServiceMock: {
    initializeMap: ReturnType<typeof vi.fn>;
    renderTelemetryPoints: ReturnType<typeof vi.fn>;
    disposeMap: ReturnType<typeof vi.fn>;
  };
  let telemetryServiceMock: {
    getLocalMockTelemetry: ReturnType<typeof vi.fn>;
    getLiveTelemetry: ReturnType<typeof vi.fn>;
  };

  const mockRecords: BioTelemetryRecord[] = [
    {
      id: 'rec-1',
      subjectId: 'sub-1',
      species: 'AVIAN_MIGRATORY',
      timestamp: new Date().toISOString(),
      coordinates: { lat: 10, lng: 20 },
      telemetry: {
        heartRateBpm: 100,
        bodyTemperatureC: 38.0,
        activityLevelIndex: 0.5,
      },
    },
    {
      id: 'rec-2',
      subjectId: 'sub-2',
      species: 'MARINE_CETACEAN',
      timestamp: new Date().toISOString(),
      coordinates: { lat: 15, lng: 25 },
      telemetry: {
        heartRateBpm: 50,
        bodyTemperatureC: 36.5,
        activityLevelIndex: 0.2,
      },
    },
  ];

  beforeEach(() => {
    mapServiceMock = {
      initializeMap: vi.fn(),
      renderTelemetryPoints: vi.fn(),
      disposeMap: vi.fn(),
    };

    telemetryServiceMock = {
      getLocalMockTelemetry: vi.fn().mockReturnValue(of(mockRecords)),
      getLiveTelemetry: vi.fn().mockReturnValue(of([mockRecords[0]])),
    };

    TestBed.configureTestingModule({
      providers: [
        MapContainer,
        { provide: LeafletMapService, useValue: mapServiceMock },
        { provide: TelemetryStreamService, useValue: telemetryServiceMock },
      ],
    });

    component = TestBed.inject(MapContainer);
  });

  it('should create the component successfully', () => {
    expect(component).toBeTruthy();
    expect(component.dataSourceMode()).toBe('mock');
    expect(component.selectedStudyId).toBe('7006760');
  });

  describe('ngAfterViewInit', () => {
    it('should initialize the leaflet map on view initialization', () => {
      // Act
      component.ngAfterViewInit();

      // Assert
      expect(mapServiceMock.initializeMap).toHaveBeenCalledWith(
        'leaflet-spatial-canvas',
        [15.0, 10.0],
        3,
      );
    });
  });

  describe('Dataset switching actions', () => {
    it('should update dataSourceMode to mock when switchToMockDataset is called', () => {
      // Arrange
      component.dataSourceMode.set('7006760');

      // Act
      component.switchToMockDataset();

      // Assert
      expect(component.dataSourceMode()).toBe('mock');
    });

    it('should update dataSourceMode to the given study ID when switchToLiveDataset is called', () => {
      // Act
      component.switchToLiveDataset('2911040');

      // Assert
      expect(component.dataSourceMode()).toBe('2911040');
      expect(telemetryServiceMock.getLiveTelemetry).toHaveBeenCalledWith('2911040');
    });

    it('should correctly capture study ID changes from UI events', () => {
      // Arrange
      const mockEvent = { target: { value: '10700240' } };

      // Act
      component.onStudyChange(mockEvent);

      // Assert
      expect(component.selectedStudyId).toBe('10700240');
    });
  });

  describe('Filtering and effects', () => {
    it('should clear filtered records when liveStreamEnabled filter is set to false', () => {
      // Act
      component.onFilterUpdated({
        species: 'ALL',
        minHeartRate: 20,
        maxHeartRate: 220,
        liveStreamEnabled: false,
      });

      // Assert
      expect(component.filteredRecords()).toEqual([]);
    });

    it('should filter records properly based on species and heart rate criteria', () => {
      // Act - filter for avian species only with strict heart rate range matching rec-1
      component.onFilterUpdated({
        species: 'AVIAN_MIGRATORY',
        minHeartRate: 90,
        maxHeartRate: 110,
        liveStreamEnabled: true,
      });

      // Assert
      const activeFiltered = component.filteredRecords();
      expect(activeFiltered.length).toBe(1);
      expect(activeFiltered[0].id).toBe('rec-1');
      expect(mapServiceMock.renderTelemetryPoints).toHaveBeenCalledWith(activeFiltered);
    });
  });
});
