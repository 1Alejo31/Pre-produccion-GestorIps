// Archivo: Home (standalone component)
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
import { Aplicaciones } from "../../features/admin/aplicaciones/aplicaciones";
import { PsicologiaGestion } from "../../features/admin/psicologiaGestion/psicologia-gestion";
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

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
    imports: [CommonModule, Topbar, Aside, RegistroUsuarios, GestorIps, HojaVida, IpsGestion, Aplicaciones, PsicologiaGestion],
    templateUrl: './home.html',
    styleUrls: ['./home.css'],
})
export class Home implements OnInit, OnDestroy, AfterViewInit {

    user: User | null = null;
    private tokenCheckInterval: any;

    // Variables para controlar la visibilidad de los paneles
    canViewGestorUsuarios: boolean = false;
    canViewAdminIps: boolean = false;
    canViewIpsGestion: boolean = false;
    canViewGestorHojaVida: boolean = false;
    // Nueva bandera para el panel Psicología Gestión
    canViewPsicologiaGestion: boolean = false;

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        // Verificar autenticaci?n inicial
        if (!this.authService.isAuthenticated()) {
            this.authService.logout();
            return;
        }

        // Obtener informaci?n del usuario
        this.user = this.authService.getUserInfo();

        if (!this.user) {
            this.authService.logout();
            return;
        }

        // Establecer permisos basados en el perfil
        this.setPermissions();

        // Configurar verificaci?n peri?dica del token cada 2 minutos
        this.tokenCheckInterval = setInterval(() => {
            this.checkAuthStatus();
        }, 120000); // 2 minutos

        // Verificaci?n inicial
        this.checkAuthStatus();
    }

    @ViewChild('lineChart') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('barChart') barChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('pieChart') pieChartCanvas!: ElementRef<HTMLCanvasElement>;

    lineChart: Chart<'line'> | null = null;
    barChart: Chart<'bar'> | null = null;
    pieChart: Chart<'pie'> | null = null;

    ngAfterViewInit(): void {
        Chart.register(...registerables);
        this.initCharts();
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
                    this.canViewPsicologiaGestion = true;
                }
                break;

            case 'supervisor':
                // Supervisor puede ver todo menos Gestor de Usuario
                this.canViewAdminIps = true;
                this.canViewIpsGestion = true;
                this.canViewGestorHojaVida = true;
                break;

            case 'gerente':
                this.canViewAdminIps = true;
                this.canViewIpsGestion = true;
                this.canViewGestorHojaVida = true;
                break;

            case 'usuario':
                // Usuario solo puede ver IPS Gesti?n
                this.canViewIpsGestion = true;
                break;

            case 'agente':
                this.canViewIpsGestion = true;
                break;

            case 'cliente':
                // Cliente solo puede ver Gestor Hoja de Vida
                this.canViewGestorHojaVida = true;
                break;

            case 'supervisor_psicologia':
                this.canViewPsicologiaGestion = true;
                break;

            case 'psicologo':
                this.canViewPsicologiaGestion = true;
                break;

            case 'coordinador':
                this.canViewAdminIps = true;
                this.canViewIpsGestion = true;
                this.canViewGestorHojaVida = true;
                break;

            case 'analista':
                this.canViewIpsGestion = true;
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
            case 'psicologiaGestion':
                return this.canViewPsicologiaGestion;
            case 'hojaVida':
                return this.canViewGestorHojaVida;
            case 'aplicaciones':
                return this.canViewGestorUsuarios || this.canViewAdminIps || this.canViewIpsGestion || this.canViewGestorHojaVida;
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

    activePanel: 'dashboard' | 'registroUsuarios' | 'gestorIps' | 'hojaVida' | 'ipsGestion' | 'psicologiaGestion' | 'aplicaciones' = 'dashboard';

    activatePanel(panel: string) {
        // Validar que el panel sea v?lido y que el usuario tenga permisos
        if ((panel === 'dashboard' || panel === 'registroUsuarios' || panel === 'gestorIps' || panel === 'hojaVida' || panel === 'ipsGestion' || panel === 'psicologiaGestion' || panel === 'aplicaciones') && this.canAccessPanel(panel)) {
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

    private initCharts(): void {
        const lineCtx = this.lineChartCanvas?.nativeElement?.getContext('2d');
        const barCtx = this.barChartCanvas?.nativeElement?.getContext('2d');
        const pieCtx = this.pieChartCanvas?.nativeElement?.getContext('2d');

        if (lineCtx) {
            const config: ChartConfiguration<'line'> = {
                type: 'line',
                data: {
                    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                    datasets: [
                        {
                            label: 'Sesiones',
                            data: [3, 5, 4, 6, 7, 2, 4],
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true },
                        tooltip: { enabled: true }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            };
            this.lineChart = new Chart(lineCtx, config);
        }

        if (barCtx) {
            const config: ChartConfiguration<'bar'> = {
                type: 'bar',
                data: {
                    labels: ['Administrador', 'Supervisor', 'Usuario', 'Cliente', 'Psicología'],
                    datasets: [
                        {
                            label: 'Usuarios por rol',
                            data: [5, 8, 20, 6, 4],
                            backgroundColor: 'rgba(255, 159, 64, 0.6)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true },
                        tooltip: { enabled: true }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            };
            this.barChart = new Chart(barCtx, config);
        }

        if (pieCtx) {
            const config: ChartConfiguration<'pie'> = {
                type: 'pie',
                data: {
                    labels: ['Activo', 'Inactivo', 'Suspendido'],
                    datasets: [
                        {
                            label: 'Distribución',
                            data: [18, 5, 2],
                            backgroundColor: [
                                'rgba(75, 192, 192, 0.6)',
                                'rgba(255, 99, 132, 0.6)',
                                'rgba(255, 205, 86, 0.6)'
                            ],
                            borderColor: [
                                'rgba(75, 192, 192, 1)',
                                'rgba(255, 99, 132, 1)',
                                'rgba(255, 205, 86, 1)'
                            ],
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true },
                        tooltip: { enabled: true }
                    }
                }
            };
            this.pieChart = new Chart(pieCtx, config);
        }
    }

    private destroyCharts(): void {
        this.lineChart?.destroy();
        this.barChart?.destroy();
        this.pieChart?.destroy();
        this.lineChart = null;
        this.barChart = null;
        this.pieChart = null;
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
        this.destroyCharts();
    }
}
