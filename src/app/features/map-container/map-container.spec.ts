/// <reference types="vitest/globals" />

import { TestBed } from '@angular/core/testing';
import { MapContainer } from './map-container';
import { LeafletMapService } from '../../core/services/map.service';
import { TelemetryStreamService } from '../../core/services/stream.service';
import { signal } from '@angular/core';

describe('MapContainer', () => {
  let component: MapContainer;
  let mockMapService: Partial<LeafletMapService>;
  let mockTelemetryService: Partial<TelemetryStreamService>;

  // Setup testing module and mock service dependencies before each test
  beforeEach(async () => {
    mockMapService = {
      initializeMap: vi.fn(),
      renderTelemetryPoints: vi.fn(),
      disposeMap: vi.fn(),
    };

    mockTelemetryService = {
      selectedStudyId: signal('2911040'),
      useMockFallback: signal(false),
      isLoading: signal(false),
      liveError: signal(null),
      telemetryRecords: signal([
        {
          id: 'rec-1',
          subjectId: 'Albatross-1',
          species: 'AVIAN_MIGRATORY',
          timestamp: '2026-06-01T12:00:00Z',
          coordinates: { lat: 10, lng: 10 },
          telemetry: { heartRateBpm: 80, bodyTemperatureC: 38, activityLevelIndex: 0.5 },
        },
      ]),
      setStudyId: vi.fn(),
      activateMockFallback: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MapContainer],
    })
      .overrideComponent(MapContainer, {
        set: {
          providers: [
            { provide: LeafletMapService, useValue: mockMapService },
            { provide: TelemetryStreamService, useValue: mockTelemetryService },
          ],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(MapContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize map and fetch default study data on ngAfterViewInit', () => {
    component.ngAfterViewInit();

    expect(mockMapService.initializeMap).toHaveBeenCalledWith(
      'leaflet-spatial-canvas',
      [15.0, 10.0],
      3,
    );
    expect(mockTelemetryService.setStudyId).toHaveBeenCalledWith('2911040');
  });

  it('should update selected study ID on input change event', () => {
    const mockEvent = {
      target: { value: '1234567' },
    } as unknown as Event;

    component.onStudyChange(mockEvent);

    expect(component.selectedStudyId()).toBe('1234567');
  });

  it('should switch dataset and clear errors when switchToLiveDataset is called', () => {
    component.switchToLiveDataset('9999999');

    expect(mockTelemetryService.setStudyId).toHaveBeenCalledWith('9999999');
    expect(component.errorMessage()).toBeNull();
  });

  it('should handle error dismissal properly', () => {
    // Force set an error message
    (component as unknown as { errorMessage: ReturnType<typeof signal> }).errorMessage.set(
      'Test error banner',
    );
    expect(component.errorMessage()).toBe('Test error banner');

    component.dismissError();

    expect(component.errorMessage()).toBeNull();
  });

  it('should filter telemetry records correctly according to criteria', () => {
    const filterModel = {
      species: 'AVIAN_MIGRATORY' as const,
      minHeartRate: 50,
      maxHeartRate: 100,
      liveStreamEnabled: true,
    };

    component.onFilterUpdated(filterModel);

    expect(component.filteredRecords().length).toBe(1);
    expect(component.filteredRecords()[0].subjectId).toBe('Albatross-1');
  });

  it('should return empty filtered records when live stream filter is disabled', () => {
    const filterModel = {
      species: 'ALL' as const,
      minHeartRate: 0,
      maxHeartRate: 300,
      liveStreamEnabled: false,
    };

    component.onFilterUpdated(filterModel);

    expect(component.filteredRecords().length).toBe(0);
  });
});
