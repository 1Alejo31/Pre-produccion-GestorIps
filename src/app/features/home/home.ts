import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Topbar } from "../../shared/topbar/topbar";
import { Aside } from "../../shared/aside/aside";
import { RegistroUsuarios } from "../../features/admin/registroUsuarios/registro-usuarios";
import { HojaVida } from "../../features/admin/HojaVida/hoja-vida";
import { IpsGestion } from "../../features/admin/ipsGestion/ips-gestion";
import Swal from 'sweetalert2';
import { GestorIps } from "../../features/admin/gestorIps/gestor-ips";



interface User {
    perfil: string;
    empresa: string;
    nombre: string;
    apellido: string;
    correo: string;
    cel: string;
    permiso: string;
}

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, Topbar, Aside, RegistroUsuarios, GestorIps, HojaVida, IpsGestion],
    templateUrl: './home.html',
    styleUrls: ['./home.css'],
})
export class Home implements OnInit, OnDestroy {

    user: User | null = null;
    private tokenCheckInterval: any;

    // Variables para controlar la visibilidad de los paneles
    canViewGestorUsuarios: boolean = false;
    canViewAdminIps: boolean = false;
    canViewIpsGestion: boolean = false;
    canViewGestorHojaVida: boolean = false;

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        // Verificar autenticación inicial
        if (!this.authService.isAuthenticated()) {
            this.authService.logout();
            return;
        }

        // Obtener información del usuario
        this.user = this.authService.getUserInfo();

        if (!this.user) {
            this.authService.logout();
            return;
        }

        // Establecer permisos basados en el perfil
        this.setPermissions();

        // Configurar verificación periódica del token cada 2 minutos
        this.tokenCheckInterval = setInterval(() => {
            this.checkAuthStatus();
        }, 120000); // 2 minutos

        // Verificación inicial
        this.checkAuthStatus();
    }

    hasPermiso(tipo: 'Lectura' | 'Escritura'): boolean {
        const permiso = this.user?.permiso?.toLowerCase() ?? '';
        return permiso.includes(tipo.toLowerCase());
    }

    /**
     * Establece los permisos basados en el perfil del usuario
     */
    private setPermissions(): void {
        if (!this.user || !this.user.perfil) {
            this.resetPermissions();
            return;
        }

        const perfil = this.user.perfil.toLowerCase();
        const permiso = this.user.permiso?.toLowerCase() || '';

        // Resetear permisos
        this.resetPermissions();

        switch (perfil) {
            case 'administrador':
                // Administrador con Lectura y Escritura puede ver todo
                if (permiso.includes('lectura') && permiso.includes('escritura')) {
                    this.canViewGestorUsuarios = true;
                    this.canViewAdminIps = true;
                    this.canViewIpsGestion = true;
                    this.canViewGestorHojaVida = true;
                }
                break;

            case 'supervisor':
                // Supervisor puede ver todo menos Gestor de Usuario
                this.canViewAdminIps = true;
                this.canViewIpsGestion = true;
                this.canViewGestorHojaVida = true;
                break;

            case 'usuario':
                // Usuario solo puede ver IPS Gestión
                this.canViewIpsGestion = true;
                break;

            case 'cliente':
                // Cliente solo puede ver Gestor Hoja de Vida
                this.canViewGestorHojaVida = true;
                break;

            default:
                // Perfil no reconocido, no mostrar nada
                this.resetPermissions();
                break;
        }
    }

    /**
     * Resetea todos los permisos a false
     */
    private resetPermissions(): void {
        this.canViewGestorUsuarios = false;
        this.canViewAdminIps = false;
        this.canViewIpsGestion = false;
        this.canViewGestorHojaVida = false;
    }

    /**
     * Verifica si el usuario puede acceder a un panel específico
     */
    canAccessPanel(panel: string): boolean {
        switch (panel) {
            case 'registroUsuarios':
                return this.canViewGestorUsuarios;
            case 'gestorIps':
                return this.canViewAdminIps;
            case 'ipsGestion':
                return this.canViewIpsGestion;
            case 'hojaVida':
                return this.canViewGestorHojaVida;
            case 'dashboard':
                return true; // Dashboard siempre accesible
            default:
                return false;
        }
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
    }

    isSidebarCollapsed = false;

    toggleSidebar(): void {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
    }

    activePanel: 'dashboard' | 'registroUsuarios' | 'gestorIps' | 'hojaVida' | 'ipsGestion' = 'dashboard';

    activatePanel(panel: string) {
        // Validar que el panel sea válido y que el usuario tenga permisos
        if ((panel === 'dashboard' || panel === 'registroUsuarios' || panel === 'gestorIps' || panel === 'hojaVida' || panel === 'ipsGestion') && this.canAccessPanel(panel)) {
            this.activePanel = panel;
        } else if (!this.canAccessPanel(panel)) {
            // Mostrar mensaje de acceso denegado
            Swal.fire({
                title: 'Acceso Denegado',
                text: 'No tienes permisos para acceder a esta sección.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
        }
    }

    getSessionDuration(): number {
        return this.authService.getSessionDuration();
    }

    checkAuthStatus(): void {
        if (!this.authService.isAuthenticated()) {
            Swal.fire({
                title: 'Sesión Inválida',
                text: 'Tu sesión ha expirado. Serás redirigido al login.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            }).then(() => {
                this.authService.logout();
            });
        }
    }

    /**
     * Verifica si el usuario tiene al menos un permiso
     */
    hasAnyPermission(): boolean {
        return this.hasPermiso('Lectura') || this.hasPermiso('Escritura');
    }

    ngOnDestroy(): void {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
    }
}