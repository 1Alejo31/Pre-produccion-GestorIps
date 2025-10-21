import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Home } from './features/home/home';
import { RegistroUsuarios } from './features/admin/registroUsuarios/registro-usuarios';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
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
