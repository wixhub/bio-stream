import { Service, DestroyRef, inject } from '@angular/core';
import * as L from 'leaflet';
import { BioTelemetryRecord } from '../models/telemetry.model';
import { environment } from '../../../environments/environment';

@Service()
export class LeafletMapService {
  private mapInstance: L.Map | null = null;
  private readonly markerLayerGroup = L.layerGroup();
  private readonly vectorLayerGroup = L.layerGroup();
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Automatically clean up Leaflet map instance on service destruction
    this.destroyRef.onDestroy(() => {
      this.disposeMap();
    });
  }

  /**
   * Initializes the Leaflet map inside the specified DOM container element
   */
  public initializeMap(
    containerId: string,
    initialCenter: [number, number] = [20, 0],
    zoom: number = 3,
  ): void {
    if (this.mapInstance) return;

    this.mapInstance = L.map(containerId, {
      zoomControl: false,
      attributionControl: true,
    }).setView(initialCenter, zoom);

    L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${environment.cartoApiKey}`,
      {
        attribution: '&copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      },
    ).addTo(this.mapInstance);

    this.markerLayerGroup.addTo(this.mapInstance);
    this.vectorLayerGroup.addTo(this.mapInstance);

    // Force Leaflet to recalculate container dimensions after DOM settlement
    setTimeout(() => {
      this.mapInstance?.invalidateSize();
    }, 150);
  }

  /**
   * Renders telemetry points as markers, connects them with vector polylines,
   * and automatically fits map bounds to the active data points.
   */
  public renderTelemetryPoints(records: readonly BioTelemetryRecord[]): void {
    if (!this.mapInstance) return;

    this.markerLayerGroup.clearLayers();
    this.vectorLayerGroup.clearLayers();

    const latLngs: L.LatLngExpression[] = [];

    records.forEach((record) => {
      const latLng: [number, number] = [record.coordinates.lat, record.coordinates.lng];
      latLngs.push(latLng);

      const marker = L.circleMarker(latLng, {
        radius: 6,
        fillColor: this.getSpeciesColor(record.species),
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      });

      marker.bindPopup(`
        <div style="font-family:sans-serif; font-size:12px;">
          <strong>Subject:</strong> ${record.subjectId}<br/>
          <strong>Species:</strong> ${record.species}<br/>
          <strong>HR:</strong> ${record.telemetry.heartRateBpm} BPM<br/>
          <strong>Time:</strong> ${new Date(record.timestamp).toLocaleTimeString()}
        </div>
      `);

      this.markerLayerGroup.addLayer(marker);
    });

    if (latLngs.length > 0) {
      // Automatically zoom and pan map to tightly fit all rendered telemetry points
      const bounds = L.latLngBounds(latLngs);
      this.mapInstance.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 9, // Prevent over-zooming when points are sparse or few
      });
    }

    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 2,
        dashArray: '4, 8',
        opacity: 0.6,
      });
      this.vectorLayerGroup.addLayer(polyline);
    }
  }

  /**
   * Maps species type union to a specific marker color code
   */
  private getSpeciesColor(species: string): string {
    switch (species) {
      case 'AVIAN_MIGRATORY':
        return '#10b981';
      case 'MARINE_CETACEAN':
        return '#06b6d4';
      case 'TERRESTRIAL_UNGULATE':
        return '#f59e0b';
      default:
        return '#6366f1';
    }
  }

  /**
   * Destroys and cleans up the Leaflet map instance safely
   */
  public disposeMap(): void {
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }
}
