import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MapContainer } from './map-container';
import { TelemetryStreamService } from '../../core/services/stream.service';
import { LeafletMapService } from '../../core/services/map.service';
import { signal } from '@angular/core';

describe('MapContainer Component', () => {
  let component: MapContainer;
  let fixture: ComponentFixture<MapContainer>;
  let telemetryService: TelemetryStreamService;
  let mapService: LeafletMapService;

  // Mock implementation for LeafletMapService to avoid DOM/leaflet canvas loading errors in tests
  const mockMapService = {
    initializeMap: vi.fn(),
    disposeMap: vi.fn(),
    renderTelemetryPoints: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapContainer],
      providers: [
        TelemetryStreamService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LeafletMapService, useValue: mockMapService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapContainer);
    component = fixture.componentInstance;
    telemetryService = TestBed.inject(TelemetryStreamService);
    mapService = TestBed.inject(LeafletMapService);
  });

  it('should create the MapContainer component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the map on ngAfterViewInit and clean up on destroy', () => {
    const initializeSpy = vi.spyOn(mapService, 'initializeMap');
    const disposeSpy = vi.spyOn(mapService, 'disposeMap');

    // Trigger ngAfterViewInit lifecycle
    component.ngAfterViewInit();
    expect(initializeSpy).toHaveBeenCalledWith('leaflet-spatial-canvas', [15.0, 10.0], 3);

    // Trigger destroy lifecycle via DestroyRef
    fixture.destroy();
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('should filter telemetry records correctly based on species and heart rate filters', () => {
    // Stub telemetryRecords to return pre-defined mock data items
    const mockRecords: any[] = [
      {
        id: 'rec-1',
        subjectId: 'sub-1',
        species: 'AVIAN_MIGRATORY',
        timestamp: '2026-06-01T12:00:00.000Z',
        coordinates: { lat: 10, lng: 10 },
        telemetry: { heartRateBpm: 120, bodyTemperatureC: 38, activityLevelIndex: 0.5 },
      },
      {
        id: 'rec-2',
        subjectId: 'sub-2',
        species: 'MARINE_CETACEAN',
        timestamp: '2026-06-01T12:01:00.000Z',
        coordinates: { lat: 20, lng: 20 },
        telemetry: { heartRateBpm: 45, bodyTemperatureC: 37, activityLevelIndex: 0.2 },
      },
    ];

    // Override the computed signal output of telemetryRecords for test isolation
    vi.spyOn(telemetryService, 'telemetryRecords', 'get').mockReturnValue(
      signal(mockRecords) as any,
    );

    // Re-instantiate or trigger effect evaluation by updating filters
    component.onFilterUpdated({
      species: 'AVIAN_MIGRATORY',
      minHeartRate: 100,
      maxHeartRate: 150,
      liveStreamEnabled: true,
    });

    fixture.detectChanges();

    // Only the first record matches both species and heart rate range
    expect(component.filteredRecords().length).toBe(1);
    expect(component.filteredRecords()[0].id).toBe('rec-1');
    expect(mapService.renderTelemetryPoints).toHaveBeenCalled();
  });

  it('should handle manual dataset switching to live or mock mode', () => {
    const setStudyIdSpy = vi.spyOn(telemetryService, 'setStudyId');
    const activateMockSpy = vi.spyOn(telemetryService, 'activateMockFallback');

    // Switch to live dataset study ID
    component.switchToLiveDataset('123456');
    expect(setStudyIdSpy).toHaveBeenCalledWith('123456');

    // Switch back to mock dataset mode
    component.switchToMockDataset();
    expect(activateMockSpy).toHaveBeenCalled();
  });

  it('should allow manual dismissal of the error banner', () => {
    // Force set error message state
    component['errorMessage'].set('Test streaming error');
    expect(component.errorMessage()).toBe('Test streaming error');

    // Dismiss error banner
    component.dismissError();
    expect(component.errorMessage()).toBeNull();
  });
});
