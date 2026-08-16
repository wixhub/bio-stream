import { Routes } from '@angular/router';
import { MapContainer } from './features/map-container/map-container';

export const routes: Routes = [
  {
    path: '',
    component: MapContainer,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
