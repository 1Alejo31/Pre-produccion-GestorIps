import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { LoginService } from '../features/login/login.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    private refreshInterval: any;
    private readonly REFRESH_THRESHOLD_MINUTES = 30; // Renovar cuando queden 30 minutos
    private readonly SESSION_DURATION_HOURS = 3; // Duración objetivo de 3 horas

    constructor(private router: Router, private loginService: LoginService) {
        // Verificar autenticación al inicializar el servicio
        this.checkAuthStatus();
        // Iniciar verificación periódica de renovación
        this.startAutoRefresh();
    }

    /**
     * Verifica si el token existe y es válido
     */
    isTokenValid(): boolean {
        const token = localStorage.getItem('token');

        if (!token || token.trim() === '') {
            return false;
        }

        try {
            // Decodificar el token JWT para verificar expiración
            const payload = this.decodeToken(token);

            if (!payload || !payload.exp) {
                return false;
            }

            // Verificar si el token ha expirado
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp > currentTime;
        } catch (error) {
            console.error('Error al verificar token:', error);
            return false;
        }
    }

    /**
     * Decodifica un token JWT
     */
    private decodeToken(token: string): any {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error al decodificar token:', error);
            return null;
        }
    }

    /**
     * Verifica el estado de autenticación
     */
    checkAuthStatus(): void {
        const isValid = this.isTokenValid();
        this.isAuthenticatedSubject.next(isValid);
    
        if (!isValid && this.router.url !== '/login') {
            this.logout();
        }
    }

    /**
     * Verifica si el token está próximo a expirar (para uso interno)
     */
    isTokenExpiringSoon(): boolean {
        const timeRemaining = this.getTokenTimeRemaining();
        return timeRemaining <= 10 && timeRemaining > 0; // 10 minutos o menos
    }
    /**
     * Establece el estado de autenticación
     */
    setAuthStatus(isAuthenticated: boolean): void {
        this.isAuthenticatedSubject.next(isAuthenticated);
    }

    /**
     * Cierra la sesión del usuario
     */
    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.isAuthenticatedSubject.next(false);

        Swal.fire({
            icon: 'warning',
            title: 'Sesión Cerrada',
            text: 'Tu sesión ha expirado o ha sido cerrada',
            timer: 2000,
            showConfirmButton: false
        });

        this.router.navigate(['/login']);
    }

    /**
     * Maneja errores de autenticación (401)
     */
    handleAuthError(): void {
        this.logout();
    }

    /**
     * Obtiene información del usuario desde localStorage
     */
    getUserInfo(): any {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error al obtener información del usuario:', error);
            return null;
        }
    }

    /**
     * Obtiene el token del localStorage
     */
    getToken(): string | null {
        return localStorage.getItem('token');
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated(): boolean {
        return this.isTokenValid();
    }

    /**
     * Obtiene el tiempo transcurrido desde el login en minutos
     */
    getSessionDuration(): number {
        const token = localStorage.getItem('token');

        if (!token) return 0;

        try {
            const payload = this.decodeToken(token);
            if (!payload || !payload.iat) return 0;

            const currentTime = Math.floor(Date.now() / 1000);
            const sessionDuration = currentTime - payload.iat;

            return Math.max(0, Math.floor(sessionDuration / 60)); // Convertir a minutos
        } catch (error) {
            return 0;
        }
    }

    /**
     * Obtiene el tiempo restante del token en minutos (para uso interno)
     */
    private getTokenTimeRemaining(): number {
        const token = localStorage.getItem('token');

        if (!token) return 0;

        try {
            const payload = this.decodeToken(token);
            if (!payload || !payload.exp) return 0;

            const currentTime = Math.floor(Date.now() / 1000);
            const timeRemaining = payload.exp - currentTime;

            return Math.max(0, Math.floor(timeRemaining / 60)); // Convertir a minutos
        } catch (error) {
            return 0;
        }
    }

    /**
     * Inicia la renovación automática del token
     */
    private startAutoRefresh(): void {
        // Verificar cada 5 minutos si necesitamos renovar el token
        this.refreshInterval = setInterval(() => {
            this.checkAndRefreshToken();
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Verifica y renueva el token si está próximo a expirar
     */
    private checkAndRefreshToken(): void {
        if (!this.isAuthenticated()) {
            return;
        }

        const timeRemaining = this.getTokenTimeRemaining();
        
        // Si quedan menos de 30 minutos para expirar, renovar el token
        if (timeRemaining <= this.REFRESH_THRESHOLD_MINUTES && timeRemaining > 0) {
            this.refreshToken();
        }
    }

    /**
     * Renueva el token automáticamente
     */
    private refreshToken(): void {
        this.loginService.refreshToken().subscribe({
            next: (response) => {
                if (response && response.token) {
                    // Actualizar el token en localStorage
                    localStorage.setItem('token', response.token);
                    
                    // Actualizar el estado de autenticación
                    this.checkAuthStatus();
                    
                    console.log('Token renovado exitosamente. Nueva duración: 3 horas');
                }
            },
            error: (error) => {
                console.error('Error al renovar token:', error);
                // Si falla la renovación, cerrar sesión
                this.logout();
            }
        });
    }

    /**
     * Obtiene el tiempo de expiración del token en minutos
     */
    getTokenExpirationTime(): number {
        const token = localStorage.getItem('token');
        
        if (!token) return 0;
        
        try {
            const payload = this.decodeToken(token);
            if (!payload || !payload.exp || !payload.iat) return 0;
            
            const totalDuration = payload.exp - payload.iat;
            return Math.floor(totalDuration / 60); // Convertir a minutos
        } catch (error) {
            return 0;
        }
    }

    /**
     * Limpia los intervalos cuando se destruye el servicio
     */
    ngOnDestroy(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}