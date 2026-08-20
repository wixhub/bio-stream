import { Service, signal, computed } from '@angular/core';
import { httpResource, HttpParams } from '@angular/common/http';
import { BioTelemetryRecord, SpeciesType } from '../models/telemetry.model';

@Service()
export class TelemetryStreamService {
  private readonly workerBaseUrl = 'https://wispy-surf-c9db.rublin.workers.dev';

  // Reactive signals for parameters and fallback control
  public readonly selectedStudyId = signal<string>('7006760');
  public readonly useMockFallback = signal<boolean>(false);

  // Resource for local static mock telemetry data
  public readonly localMockResource = httpResource<BioTelemetryRecord[]>(
    () => 'data/telemetry-mock.json',
    {
      defaultValue: [],
    },
  );

  // Dynamic resource for live telemetry streaming from Movebank via Cloudflare Worker proxy
  public readonly liveTelemetryResource = httpResource<BioTelemetryRecord[]>(
    () => {
      // If mock fallback is manually forced, skip network call
      if (this.useMockFallback()) return undefined;

      const studyId = this.selectedStudyId();
      const params = new HttpParams()
        .set('entity_type', 'event')
        .set('study_id', studyId)
        .set('i_can_see_data', 'true');

      return {
        url: this.workerBaseUrl,
        params,
        responseType: 'text' as const,
      };
    },
    {
      defaultValue: [],
      // Parse raw CSV text response into typed BioTelemetryRecord array
      parse: (responseText: unknown): BioTelemetryRecord[] => {
        const text = typeof responseText === 'string' ? responseText : '';
        if (!text || text.includes('error code:') || text.includes('<p>')) {
          throw new Error('Cloudflare worker timeout or upstream Movebank error');
        }

        const lines = text.split('\n').filter((l) => l.trim().length > 0);
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
      },
    },
  );

  // Convenient computed signal to transparently fallback to local mock data on live error/timeout
  public readonly telemetryRecords = computed(() => {
    const liveError = this.liveTelemetryResource.error();
    const liveData = this.liveTelemetryResource.value();

    if (liveError || this.useMockFallback() || (liveData && liveData.length === 0)) {
      return this.localMockResource.value() ?? [];
    }
    return liveData ?? [];
  });

  public readonly isLoading = computed(
    () => this.liveTelemetryResource.isLoading() || this.localMockResource.isLoading(),
  );

  /**
   * Triggers a query update for a new study ID
   */
  public setStudyId(studyId: string): void {
    this.useMockFallback.set(false);
    this.selectedStudyId.set(studyId);
  }

  /**
   * Manually forces fallback to local mock data
   */
  public activateMockFallback(): void {
    this.useMockFallback.set(true);
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
