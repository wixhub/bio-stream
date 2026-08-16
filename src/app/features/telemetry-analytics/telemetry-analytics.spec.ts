import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelemetryAnalytics } from './telemetry-analytics';

describe('TelemetryAnalytics', () => {
  let component: TelemetryAnalytics;
  let fixture: ComponentFixture<TelemetryAnalytics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelemetryAnalytics],
    }).compileComponents();

    fixture = TestBed.createComponent(TelemetryAnalytics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
