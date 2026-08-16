import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelemetryFilters } from './telemetry-filters';

describe('TelemetryFilters', () => {
  let component: TelemetryFilters;
  let fixture: ComponentFixture<TelemetryFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelemetryFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(TelemetryFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
