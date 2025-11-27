import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
    selector: 'app-aside',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './aside.html',
    styleUrls: ['./aside.css']
})

export class Aside implements OnInit {
    @Input() activePanel: string = 'dashboard';
    @Output() selectPanel = new EventEmitter<string>();

    // Variables para controlar la visibilidad de las opciones del menú
    canViewGestorUsuarios: boolean = false;
    canViewAdminIps: boolean = false;
    canViewIpsGestion: boolean = false;
    canViewGestorHojaVida: boolean = false;
    // Nueva bandera de visibilidad para el menú de Psicología
    canViewPsicologiaGestion: boolean = false;

    // Nombre del usuario
    userName: string = '';

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.setPermissions();
    }

    /**
     * Establece los permisos basados en el perfil del usuario
     */
    private setPermissions(): void {
        const userInfo = this.authService.getUserInfo();
        
        if (!userInfo || !userInfo.perfil) {
            // Si no hay información del usuario, no mostrar nada
            this.resetPermissions();
            this.userName = '';
            return;
        }

        // Obtener el nombre del usuario
        this.userName = userInfo.nombre || userInfo.usuario || 'Usuario';

        const perfil = userInfo.perfil.toLowerCase();
        const permiso = userInfo.permiso?.toLowerCase() || '';

        // Resetear permisos
        this.resetPermissions();

        switch (perfil) {
            case 'administrador':
                if (permiso.includes('lectura') && permiso.includes('escritura')) {
                    this.canViewGestorUsuarios = true;
                    this.canViewAdminIps = true;
                    this.canViewIpsGestion = true;
                    this.canViewGestorHojaVida = true;
                    this.canViewPsicologiaGestion = true;
                }
                break;

            case 'supervisor':
                // Supervisor puede ver todo menos Gestor de Usuario
                this.canViewAdminIps = true;
                this.canViewIpsGestion = true;
                this.canViewGestorHojaVida = true;
                break;

            case 'supervisor_psicologia':
                // Supervisor de psicología
                this.canViewPsicologiaGestion = true;
                break;

            case 'psicologo':
                // Psicólogo
                this.canViewPsicologiaGestion = true;
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
        this.canViewPsicologiaGestion = false;
    }

    openRegistroUsuarios() {
        if (this.canViewGestorUsuarios) {
            this.selectPanel.emit('registroUsuarios');
        }
    }

    openGestorIps() {
        if (this.canViewAdminIps) {
            this.selectPanel.emit('gestorIps');
        }
    }

    openIpsGestion() {
        if (this.canViewIpsGestion) {
            this.selectPanel.emit('ipsGestion');
        }
    }

    openPsicologiaGestion() {
        if (this.canViewPsicologiaGestion) {
            this.selectPanel.emit('psicologiaGestion');
        }
    }

    openHojaVida() {
        if (this.canViewGestorHojaVida) {
            this.selectPanel.emit('hojaVida');
        }
    }

    openAplicaciones() {
        // Las aplicaciones están disponibles para todos los usuarios que tengan al menos un permiso
        if (this.canViewGestorUsuarios || this.canViewAdminIps || this.canViewIpsGestion || this.canViewGestorHojaVida) {
            this.selectPanel.emit('aplicaciones');
        }
    }
}
