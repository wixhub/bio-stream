// src/app/core/models/telemetry.model.ts
export type SpeciesType = 'AVIAN_MIGRATORY' | 'MARINE_CETACEAN' | 'TERRESTRIAL_UNGULATE';

export interface GeoCoordinates {
  readonly lat: number;
  readonly lng: number;
  readonly elevationMeters?: number;
}

export interface BioTelemetryRecord {
  readonly id: string;
  readonly subjectId: string;
  readonly species: SpeciesType;
  readonly timestamp: string; // ISO 8601
  readonly coordinates: GeoCoordinates;
  readonly telemetry: {
    readonly heartRateBpm: number;
    readonly bodyTemperatureC: number;
    readonly activityLevelIndex: number;
  };
}

export interface TelemetryFilterModel {
  readonly species: SpeciesType | 'ALL';
  readonly minHeartRate: number;
  readonly maxHeartRate: number;
  readonly liveStreamEnabled: boolean;
  readonly polygonBoundaryConstraint?: readonly GeoCoordinates[];
}
