/// <reference types="vitest/globals" />

import { TestBed } from '@angular/core/testing';
import { LeafletMapService } from './map.service';
import { BioTelemetryRecord } from '../models/telemetry.model';
import * as L from 'leaflet';

describe('LeafletMapService', () => {
  let service: LeafletMapService;
  let container: HTMLDivElement;

  // Setup testing environment and create a dummy DOM container for the map
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LeafletMapService],
    });

    service = TestBed.inject(LeafletMapService);

    container = document.createElement('div');
    container.id = 'map-container';
    container.style.width = '400px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  // Clean up the DOM container after each test
  afterEach(() => {
    service.disposeMap();
    container.remove();
  });

  it('should be created successfully', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize Leaflet map instance correctly', () => {
    service.initializeMap('map-container', [10, 20], 5);

    // Access private map instance via type assertion to verify initialization
    const mapInstance = (service as unknown as { mapInstance: L.Map | null }).mapInstance;
    expect(mapInstance).not.toBeNull();
    expect(mapInstance?.getZoom()).toBe(5);
    expect(mapInstance?.getCenter().lat).toBe(10);
    expect(mapInstance?.getCenter().lng).toBe(20);
  });

  it('should not re-initialize map if already initialized', () => {
    service.initializeMap('map-container', [10, 20], 5);
    const firstInstance = (service as unknown as { mapInstance: L.Map | null }).mapInstance;

    // Try initializing again with different parameters
    service.initializeMap('map-container', [0, 0], 2);
    const secondInstance = (service as unknown as { mapInstance: L.Map | null }).mapInstance;

    expect(firstInstance).toBe(secondInstance);
  });

  it('should render telemetry markers and vector polylines correctly', () => {
    service.initializeMap('map-container');

    const sampleRecords: BioTelemetryRecord[] = [
      {
        id: 'rec-1',
        subjectId: 'Bird-A',
        species: 'AVIAN_MIGRATORY',
        timestamp: '2026-06-01T12:00:00Z',
        coordinates: { lat: 10, lng: 10 },
        telemetry: { heartRateBpm: 90, bodyTemperatureC: 38, activityLevelIndex: 0.5 },
      },
      {
        id: 'rec-2',
        subjectId: 'Whale-B',
        species: 'MARINE_CETACEAN',
        timestamp: '2026-06-01T13:00:00Z',
        coordinates: { lat: 20, lng: 20 },
        telemetry: { heartRateBpm: 60, bodyTemperatureC: 37, activityLevelIndex: 0.2 },
      },
    ];

    expect(() => service.renderTelemetryPoints(sampleRecords)).not.toThrow();

    const markerGroup = (service as unknown as { markerLayerGroup: L.LayerGroup }).markerLayerGroup;
    const vectorGroup = (service as unknown as { vectorLayerGroup: L.LayerGroup }).vectorLayerGroup;

    expect(markerGroup.getLayers().length).toBe(2);
    expect(vectorGroup.getLayers().length).toBe(1); // Polyline connecting the two points
  });

  it('should dispose map instance safely', () => {
    service.initializeMap('map-container');
    const mapInstance = (service as unknown as { mapInstance: L.Map | null }).mapInstance;
    expect(mapInstance).not.toBeNull();

    service.disposeMap();
    const disposedInstance = (service as unknown as { mapInstance: L.Map | null }).mapInstance;
    expect(disposedInstance).toBeNull();
  });
});
