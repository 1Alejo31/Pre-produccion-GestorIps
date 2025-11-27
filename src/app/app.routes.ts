import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Home } from './features/home/home';
import { RegistroUsuarios } from './features/admin/registroUsuarios/registro-usuarios';
import { Aspirante } from './features/aspirante/aspirante';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'aspirante', component: Aspirante },
    {
        path: 'home',
        component: Home,
        canActivate: [authGuard]
    },
    {
        path: 'admin/registro-usuarios',
        component: RegistroUsuarios,
        canActivate: [authGuard]
    },
    { path: '**', redirectTo: 'login' }
];
