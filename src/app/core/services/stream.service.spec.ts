/// <reference types="vitest/globals" />

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TelemetryStreamService } from './stream.service';

describe('TelemetryStreamService', () => {
  let service: TelemetryStreamService;
  let httpMock: HttpTestingController;

  const mockRecordsPayload = [
    {
      id: 'mock-1',
      subjectId: 'sub-mock',
      species: 'AVIAN_MIGRATORY' as const,
      timestamp: '2026-01-01T00:00:00Z',
      coordinates: { lat: 10, lng: 20 },
      telemetry: { heartRateBpm: 90, bodyTemperatureC: 38, activityLevelIndex: 0.5 },
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TelemetryStreamService, provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifies that no unmatched HTTP requests are outstanding
    httpMock.verify();
  });

  it('should be created and load initial mock dataset', async () => {
    // Explicitly inject the service inside this test so the constructor runs
    service = TestBed.inject(TelemetryStreamService);

    // Expect and flush the initial mock dataset request triggered by the constructor
    const req = httpMock.expectOne('data/telemetry-mock.json');
    req.flush(mockRecordsPayload);

    // Wait asynchronously for the signal state update
    await vi.waitFor(() => {
      expect(service.telemetryRecords().length).toBe(1);
    });

    expect(service).toBeTruthy();
    expect(service.telemetryRecords()[0].id).toBe('mock-1');
  });

  it('should successfully fetch and parse CSV live telemetry data', async () => {
    service = TestBed.inject(TelemetryStreamService);

    // Satisfy the constructor mock request first
    httpMock.expectOne('data/telemetry-mock.json').flush(mockRecordsPayload);

    const csvData =
      'event_id,individual_local_identifier,taxon_canonical_name,timestamp,location_lat,location_long\n' +
      '101,Bird-1,Phoebastria irrorata,2026-06-01T12:00:00Z,-0.5,-90.2';

    service.setStudyId('2911040');
    expect(service.isLoading()).toBe(true);

    const liveReq = httpMock.expectOne((request) =>
      request.url.includes('wispy-surf-c9db.rublin.workers.dev'),
    );
    expect(liveReq.request.method).toBe('GET');
    expect(liveReq.request.params.get('study_id')).toBe('2911040');

    liveReq.flush(csvData);

    await vi.waitFor(() => {
      expect(service.isLoading()).toBe(false);
    });

    expect(service.liveError()).toBeNull();
    expect(service.telemetryRecords().length).toBe(1);
    expect(service.telemetryRecords()[0].subjectId).toBe('Bird-1');
    expect(service.telemetryRecords()[0].species).toBe('AVIAN_MIGRATORY');
  });

  it('should handle cloudflare worker error responses gracefully', async () => {
    service = TestBed.inject(TelemetryStreamService);

    // Satisfy the constructor mock request first
    httpMock.expectOne('data/telemetry-mock.json').flush(mockRecordsPayload);

    service.setStudyId('9999999');

    const liveReq = httpMock.expectOne((request) =>
      request.url.includes('wispy-surf-c9db.rublin.workers.dev'),
    );
    liveReq.flush('error code: 1020 access denied', { status: 403, statusText: 'Forbidden' });

    await vi.waitFor(() => {
      expect(service.isLoading()).toBe(false);
    });

    expect(service.liveError()).toBeTruthy();
    expect(service.telemetryRecords().length).toBe(1);
  });

  it('should activate mock fallback explicitly when requested', async () => {
    service = TestBed.inject(TelemetryStreamService);

    // Satisfy the constructor mock request first
    httpMock.expectOne('data/telemetry-mock.json').flush(mockRecordsPayload);

    expect(service.useMockFallback()).toBe(false);

    service.activateMockFallback();

    await vi.waitFor(() => {
      expect(service.useMockFallback()).toBe(true);
    });

    expect(service.liveError()).toBeNull();
    expect(service.telemetryRecords().length).toBe(1);
  });
});
