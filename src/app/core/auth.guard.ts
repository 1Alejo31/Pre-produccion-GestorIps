import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import Swal from 'sweetalert2';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar si el token es válido
    if (authService.isTokenValid()) {
        authService.setAuthStatus(true);
        return true;
    }

    // Si el token no es válido, mostrar mensaje y redirigir
    Swal.fire({
        icon: 'warning',
        title: 'Acceso Denegado',
        text: 'Debes iniciar sesión para acceder a esta página',
        timer: 2000,
        showConfirmButton: false
    });

    // Limpiar datos de sesión
    authService.logout();

    return false;
};