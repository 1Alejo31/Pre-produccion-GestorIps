import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Si es un error 401 (Unauthorized)
            if (error.status === 401) {
                console.warn('Error 401 detectado - Token inválido o expirado');
                authService.handleAuthError();
            }

            return throwError(() => error);
        })
    );
};