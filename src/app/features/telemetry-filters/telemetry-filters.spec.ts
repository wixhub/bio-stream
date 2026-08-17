import { TestBed } from '@angular/core/testing';
import { TelemetryFilters } from './telemetry-filters';
import { TelemetryFilterModel } from '../../core/models/telemetry.model';

describe('TelemetryFilters', () => {
  let component: TelemetryFilters;
  let fixture: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelemetryFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(TelemetryFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component successfully with default filter values', () => {
    // Assert
    expect(component).toBeTruthy();
    expect(component.species()).toBe('ALL');
    expect(component.minHeartRate()).toBe(40);
    expect(component.maxHeartRate()).toBe(180);
    expect(component.liveStreamEnabled()).toBe(true);
  });

  it('should update species signal and emit filter changes when species selection changes', () => {
    // Arrange
    const emitSpy = vi.spyOn(component.filterChange, 'emit');
    const mockEvent = {
      target: { value: 'MARINE_CETACEAN' },
    } as unknown as Event;

    // Act
    component.onSpeciesChange(mockEvent);

    // Assert
    expect(component.species()).toBe('MARINE_CETACEAN');
    expect(emitSpy).toHaveBeenCalledWith({
      species: 'MARINE_CETACEAN',
      minHeartRate: 40,
      maxHeartRate: 180,
      liveStreamEnabled: true,
    } as TelemetryFilterModel);
  });

  it('should update minHeartRate signal and emit filter changes when min heart rate changes', () => {
    // Arrange
    const emitSpy = vi.spyOn(component.filterChange, 'emit');
    const mockEvent = {
      target: { value: '60' },
    } as unknown as Event;

    // Act
    component.onMinHeartRateChange(mockEvent);

    // Assert
    expect(component.minHeartRate()).toBe(60);
    expect(emitSpy).toHaveBeenCalledWith({
      species: 'ALL',
      minHeartRate: 60,
      maxHeartRate: 180,
      liveStreamEnabled: true,
    } as TelemetryFilterModel);
  });

  it('should update maxHeartRate signal and emit filter changes when max heart rate changes', () => {
    // Arrange
    const emitSpy = vi.spyOn(component.filterChange, 'emit');
    const mockEvent = {
      target: { value: '200' },
    } as unknown as Event;

    // Act
    component.onMaxHeartRateChange(mockEvent);

    // Assert
    expect(component.maxHeartRate()).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith({
      species: 'ALL',
      minHeartRate: 40,
      maxHeartRate: 200,
      liveStreamEnabled: true,
    } as TelemetryFilterModel);
  });

  it('should update liveStreamEnabled signal and emit filter changes when checkbox state toggles', () => {
    // Arrange
    const emitSpy = vi.spyOn(component.filterChange, 'emit');
    const mockEvent = {
      target: { checked: false },
    } as unknown as Event;

    // Act
    component.onLiveStreamChange(mockEvent);

    // Assert
    expect(component.liveStreamEnabled()).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith({
      species: 'ALL',
      minHeartRate: 40,
      maxHeartRate: 180,
      liveStreamEnabled: false,
    } as TelemetryFilterModel);
  });
});
