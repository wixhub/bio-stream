import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { BioTelemetryRecord, SpeciesType } from '../models/telemetry.model';

@Injectable({
  providedIn: 'root',
})
export class TelemetryStreamService {
  private readonly http = inject(HttpClient);
  private readonly workerBaseUrl = 'https://wispy-surf-c9db.rublin.workers.dev';

  // Fetch local static mock data for initial fallback load
  public getLocalMockTelemetry(): Observable<BioTelemetryRecord[]> {
    return this.http.get<BioTelemetryRecord[]>('data/telemetry-mock.json').pipe(
      catchError((error) => {
        console.error('Failed to load local telemetry mock', error);
        return of([]);
      }),
    );
  }

  /**
   * Fetches live telemetry event records from Movebank via the Cloudflare Worker proxy.
   * Parses incoming CSV text data into a strongly-typed BioTelemetryRecord array.
   * Automatically falls back to local mock data if a 522 timeout or upstream error occurs.
   *
   * @param studyId Real public Movebank study ID (default '7006760' for Northern Elephant Seals)
   */
  public getLiveTelemetry(studyId: string = '7006760'): Observable<BioTelemetryRecord[]> {
    const params = new HttpParams()
      .set('entity_type', 'event')
      .set('study_id', studyId)
      .set('i_can_see_data', 'true');

    return this.http.get(this.workerBaseUrl, { params, responseType: 'text' }).pipe(
      map((responseText: string) => {
        // Handle Cloudflare error pages (e.g., error code 522) or empty responses
        if (!responseText || responseText.includes('error code:') || responseText.includes('<p>')) {
          throw new Error('Cloudflare worker timeout or upstream Movebank error');
        }

        const lines = responseText.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          return [];
        }

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
        console.warn(
          'Live stream failed due to timeout or network issue. Falling back to local mock data.',
          error,
        );
        // Automatically fallback to local mock data so the map displays points successfully
        return this.getLocalMockTelemetry();
      }),
    );
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
      lower.includes('shark')
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

  private mapSpecies(taxon?: string): SpeciesType {
    if (!taxon) return 'AVIAN_MIGRATORY';
    const lower = taxon.toLowerCase();
    if (lower.includes('cetacea') || lower.includes('whale')) return 'MARINE_CETACEAN';
    if (lower.includes('ungulate') || lower.includes('deer')) return 'TERRESTRIAL_UNGULATE';
    return 'AVIAN_MIGRATORY';
  }
}
