import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapContainer } from './map-container';

describe('MapContainer', () => {
  let component: MapContainer;
  let fixture: ComponentFixture<MapContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapContainer],
    }).compileComponents();

    fixture = TestBed.createComponent(MapContainer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
