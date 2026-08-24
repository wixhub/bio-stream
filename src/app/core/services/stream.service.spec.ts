/// <reference types="vitest/globals" />

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TelemetryStreamService } from './stream.service';

describe('TelemetryStreamService', () => {
  let service: TelemetryStreamService;
  let httpMock: HttpTestingController;

  // Setup testing module and inject dependencies before each test
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TelemetryStreamService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TelemetryStreamService);
    httpMock = TestBed.inject(HttpTestingController);

    // Flush the initial mock dataset request triggered in constructor
    const mockReq = httpMock.expectOne('data/telemetry-mock.json');
    mockReq.flush([
      {
        id: 'mock-1',
        subjectId: 'sub-mock',
        species: 'AVIAN_MIGRATORY',
        timestamp: '2026-01-01T00:00:00Z',
        coordinates: { lat: 10, lng: 20 },
        telemetry: { heartRateBpm: 90, bodyTemperatureC: 38, activityLevelIndex: 0.5 },
      },
    ]);
  });

  // Ensure no unmatched requests remain after each test
  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and load initial mock dataset', () => {
    expect(service).toBeTruthy();
    expect(service.telemetryRecords().length).toBe(1);
    expect(service.telemetryRecords()[0].id).toBe('mock-1');
  });

  it('should successfully fetch and parse CSV live telemetry data', () => {
    const csvData =
      'event_id,individual_local_identifier,taxon_canonical_name,timestamp,location_lat,location_long\n' +
      '101,Bird-1,Phoebastria irrorata,2026-06-01T12:00:00Z,-0.5,-90.2';

    service.setStudyId('2911040');
    expect(service.isLoading()).toBe(true);

    const req = httpMock.expectOne((request) =>
      request.url.includes('wispy-surf-c9db.rublin.workers.dev'),
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('study_id')).toBe('2911040');

    req.flush(csvData);

    expect(service.isLoading()).toBe(false);
    expect(service.liveError()).toBeNull();
    expect(service.telemetryRecords().length).toBe(1);
    expect(service.telemetryRecords()[0].subjectId).toBe('Bird-1');
    expect(service.telemetryRecords()[0].species).toBe('AVIAN_MIGRATORY');
  });

  it('should handle cloudflare worker error responses gracefully', () => {
    service.setStudyId('9999999');

    const req = httpMock.expectOne((request) =>
      request.url.includes('wispy-surf-c9db.rublin.workers.dev'),
    );
    req.flush('error code: 1020 access denied', { status: 403, statusText: 'Forbidden' });

    expect(service.isLoading()).toBe(false);
    expect(service.liveError()).toBeTruthy();
    expect(service.telemetryRecords().length).toBe(1); // Falls back to mock dataset via computed signal
  });

  it('should activate mock fallback explicitly when requested', () => {
    expect(service.useMockFallback()).toBe(false);

    service.activateMockFallback();

    expect(service.useMockFallback()).toBe(true);
    expect(service.liveError()).toBeNull();
    expect(service.telemetryRecords().length).toBe(1);
  });
});
