import { Service, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BioTelemetryRecord, SpeciesType } from '../models/telemetry.model';

@Service()
export class TelemetryStreamService {
  private readonly http = inject(HttpClient);
  private readonly workerBaseUrl = 'https://wispy-surf-c9db.rublin.workers.dev';

  // Reactive signals for parameters and fallback control
  public readonly selectedStudyId = signal<string>('7006760');
  public readonly useMockFallback = signal<boolean>(false);

  // State signals to track loading and error states for UI feedback
  public readonly isLoading = signal<boolean>(false);
  public readonly liveError = signal<string | null>(null);

  // Store raw records fetched from live API
  private readonly liveRecords = signal<BioTelemetryRecord[]>([]);
  // Store local mock records as a fallback
  private readonly localMockRecords = signal<BioTelemetryRecord[]>([]);

  constructor() {
    // Preload local mock dataset on initialization
    this.loadMockDataset();
  }

  /**
   * Loads local static mock telemetry data
   */
  private loadMockDataset(): void {
    this.http.get<BioTelemetryRecord[]>('data/telemetry-mock.json').subscribe({
      next: (data) => this.localMockRecords.set(data ?? []),
      error: (err) => console.error('Failed to load local mock telemetry:', err),
    });
  }

  /**
   * Fetches and parses live telemetry data from Movebank via Cloudflare Worker proxy
   */
  public fetchLiveTelemetry(studyId: string): Observable<BioTelemetryRecord[]> {
    let params = new HttpParams()
      .set('entity_type', 'event')
      .set('study_id', studyId)
      .set('i_can_see_data', 'true');

    return this.http.get(this.workerBaseUrl, { params, responseType: 'text' }).pipe(
      map((responseText: string) => {
        if (!responseText || responseText.includes('error code:') || responseText.includes('<p>')) {
          throw new Error('Cloudflare worker timeout or upstream Movebank error');
        }

        const lines = responseText.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) return [];

        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map((h) => h.replace(/["']/g, '').trim());

        return lines
          .slice(1, 150)
          .map((lineStr, index) => {
            const cols = lineStr.split(delimiter);
            const item = headers.reduce((acc: Record<string, string>, h, i) => {
              acc[h] = (cols[i] ?? '').replace(/["']/g, '').trim();
              return acc;
            }, {});

            const lat = parseFloat(item['location_lat'] ?? item['lat'] ?? '0');
            const lng = parseFloat(item['location_long'] ?? item['lon'] ?? '0');

            return {
              id: `rec-${item['event_id'] ?? index}`,
              subjectId:
                item['individual_local_identifier'] ??
                item['tag_local_identifier'] ??
                `sub-${index}`,
              species: this.mapTaxonToSpeciesType(item['taxon_canonical_name']),
              timestamp: item['timestamp'] ?? new Date().toISOString(),
              coordinates: {
                lat: isNaN(lat) ? 0 : lat,
                lng: isNaN(lng) ? 0 : lng,
                elevationMeters: parseFloat(item['heightAboveEllipsoid'] ?? '0') || undefined,
              },
              telemetry: {
                heartRateBpm: parseFloat(item['heart_rate'] ?? '85') || 80,
                bodyTemperatureC: 38.0,
                activityLevelIndex: 0.5,
              },
            } as BioTelemetryRecord;
          })
          .filter((record) => record.coordinates.lat !== 0 && record.coordinates.lng !== 0);
      }),
      catchError((error) => {
        this.liveError.set(error.message || 'Failed to load live telemetry stream');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Computed signal that resolves final telemetry records (live or mock fallback)
   */
  public readonly telemetryRecords = computed(() => {
    // Fall back to local mock data if requested, if there's an error, or if live records are empty initially
    if (this.useMockFallback() || this.liveError() || this.liveRecords().length === 0) {
      return this.localMockRecords();
    }
    return this.liveRecords();
  });

  /**
   * Triggers a query update for a new study ID and executes live request
   */
  public setStudyId(studyId: string): void {
    this.useMockFallback.set(false);
    this.liveError.set(null);
    this.selectedStudyId.set(studyId);
    this.isLoading.set(true);

    this.fetchLiveTelemetry(studyId).subscribe({
      next: (records) => {
        this.liveRecords.set(records);
        this.isLoading.set(false);
        if (records.length === 0) {
          this.liveError.set(`No valid spatial telemetry points found for Study ID "${studyId}".`);
        }
      },
      error: () => {
        this.liveRecords.set([]);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Manually forces fallback to local mock data
   */
  public activateMockFallback(): void {
    this.useMockFallback.set(true);
    this.liveError.set(null);
  }

  /**
   * Helper mapping function to safely map external taxon names to application SpeciesType union.
   */
  private mapTaxonToSpeciesType(taxonName?: string): SpeciesType {
    if (!taxonName) return 'AVIAN_MIGRATORY';
    const lower = taxonName.toLowerCase();

    if (
      lower.includes('seal') ||
      lower.includes('whale') ||
      lower.includes('dolphin') ||
      lower.includes('shark') ||
      lower.includes('cetacea')
    ) {
      return 'MARINE_CETACEAN';
    }
    if (
      lower.includes('tiger') ||
      lower.includes('elephant') ||
      lower.includes('ungulate') ||
      lower.includes('deer') ||
      lower.includes('bobcat')
    ) {
      return 'TERRESTRIAL_UNGULATE';
    }
    return 'AVIAN_MIGRATORY';
  }
}
