import { Routes } from '@angular/router';
import { PosComponent } from './features/pos/pos.component';

export const routes: Routes = [
  { path: '', component: PosComponent },
  { path: '**', redirectTo: '' }
];
