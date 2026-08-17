import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TelemetryStreamService } from './stream.service';
import { BioTelemetryRecord } from '../models/telemetry.model';

describe('TelemetryStreamService', () => {
  let service: TelemetryStreamService;
  let httpMock: HttpTestingController;

  const workerUrl = 'https://wispy-surf-c9db.rublin.workers.dev';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TelemetryStreamService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TelemetryStreamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getLocalMockTelemetry', () => {
    it('should fetch local mock telemetry data successfully', () => {
      // Arrange
      const mockRecords: BioTelemetryRecord[] = [
        {
          id: 'rec-1',
          subjectId: 'sub-1',
          species: 'AVIAN_MIGRATORY',
          timestamp: new Date().toISOString(),
          coordinates: { lat: 10, lng: 20 },
          telemetry: { heartRateBpm: 80, bodyTemperatureC: 38.0, activityLevelIndex: 0.5 },
        },
      ];

      // Act
      service.getLocalMockTelemetry().subscribe((records) => {
        // Assert
        expect(records).toEqual(mockRecords);
        expect(records.length).toBe(1);
      });

      const req = httpMock.expectOne('data/telemetry-mock.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockRecords);
    });

    it('should return an empty array and handle error gracefully when local mock fails', () => {
      // Act
      service.getLocalMockTelemetry().subscribe((records) => {
        // Assert
        expect(records).toEqual([]);
      });

      const req = httpMock.expectOne('data/telemetry-mock.json');
      req.flush('Failed to load', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getLiveTelemetry', () => {
    it('should parse live CSV telemetry text into strongly-typed records', () => {
      // Arrange
      const csvResponse =
        'event_id\tindividual_local_identifier\ttaxon_canonical_name\ttimestamp\tlocation_lat\tlocation_long\n' +
        '101\tSeal-Alpha\tMirounga angustirostris (elephant seal)\t2026-06-01T12:00:00Z\t35.5\t-121.2';

      // Act
      service.getLiveTelemetry('7006760').subscribe((records) => {
        // Assert
        expect(records.length).toBe(1);
        expect(records[0].id).toBe('rec-101');
        expect(records[0].subjectId).toBe('Seal-Alpha');
        expect(records[0].species).toBe('MARINE_CETACEAN');
        expect(records[0].coordinates.lat).toBe(35.5);
        expect(records[0].coordinates.lng).toBe(-121.2);
      });

      const req = httpMock.expectOne((request) => request.url === workerUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('study_id')).toBe('7006760');
      expect(req.request.params.get('entity_type')).toBe('event');
      expect(req.request.params.get('i_can_see_data')).toBe('true');
      req.flush(csvResponse, { headers: { 'Content-Type': 'text/plain' } });
    });

    it('should fallback to local mock data when live telemetry encounters a Cloudflare timeout (error code 522)', () => {
      // Arrange
      const errorResponse = 'error code: 522';
      const mockFallbackRecords: BioTelemetryRecord[] = [
        {
          id: 'mock-rec-1',
          subjectId: 'mock-sub',
          species: 'TERRESTRIAL_UNGULATE',
          timestamp: new Date().toISOString(),
          coordinates: { lat: 1, lng: 1 },
          telemetry: { heartRateBpm: 75, bodyTemperatureC: 38.0, activityLevelIndex: 0.4 },
        },
      ];

      // Act
      service.getLiveTelemetry('7006760').subscribe((records) => {
        // Assert - should receive fallback mock data
        expect(records).toEqual(mockFallbackRecords);
      });

      const liveReq = httpMock.expectOne((request) => request.url === workerUrl);
      liveReq.flush(errorResponse, { headers: { 'Content-Type': 'text/plain' } });

      const fallbackReq = httpMock.expectOne('data/telemetry-mock.json');
      fallbackReq.flush(mockFallbackRecords);
    });
  });
});
