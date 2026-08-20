import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TelemetryStreamService } from './stream.service';

describe('TelemetryStreamService', () => {
  let service: TelemetryStreamService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TelemetryStreamService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TelemetryStreamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify that no unmatched HTTP requests are left pending
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch and parse live CSV telemetry data successfully', () => {
    // Expect automatic HTTP request to worker proxy endpoint
    const req = httpMock.expectOne((r) => r.url.includes('wispy-surf-c9db.rublin.workers.dev'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('study_id')).toBe('7006760');

    // Mock CSV telemetry payload
    const mockCsv =
      'event_id,individual_local_identifier,taxon_canonical_name,timestamp,location_lat,location_long\n' +
      '101,Seal-A,Mirounga angustirostris,2026-06-01T12:00:00Z,36.5,-121.8';

    req.flush(mockCsv);

    const records = service.telemetryRecords();
    expect(records.length).toBe(1);
    expect(records[0].id).toBe('rec-101');
    expect(records[0].subjectId).toBe('Seal-A');
    expect(records[0].species).toBe('MARINE_CETACEAN');
    expect(records[0].coordinates.lat).toBe(36.5);
  });

  it('should fallback to local mock data when live request fails', () => {
    // Flush live request with an error status (e.g., 522 timeout)
    const liveReq = httpMock.expectOne((r) => r.url.includes('wispy-surf-c9db.rublin.workers.dev'));
    liveReq.flush('Cloudflare error code: 522', { status: 522, statusText: 'Gateway Timeout' });

    // Expect automatic fallback request to local mock json file
    const mockReq = httpMock.expectOne('data/telemetry-mock.json');
    expect(mockReq.request.method).toBe('GET');

    const mockLocalData = [
      {
        id: 'mock-1',
        subjectId: 'Bird-X',
        species: 'AVIAN_MIGRATORY',
        timestamp: '2026-06-01T00:00:00Z',
        coordinates: { lat: 50.0, lng: 10.0 },
        telemetry: { heartRateBpm: 90, bodyTemperatureC: 39, activityLevelIndex: 0.8 },
      },
    ];

    mockReq.flush(mockLocalData);

    const records = service.telemetryRecords();
    expect(records.length).toBe(1);
    expect(records[0].id).toBe('mock-1');
  });
});
