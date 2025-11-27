import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './topbar.html',
    styleUrls: ['./topbar.css']
})

export class Topbar implements OnInit, OnDestroy {

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    @Output() menuToggle = new EventEmitter<void>();
    @Output() importClick = new EventEmitter<void>();
    @Output() filterClick = new EventEmitter<void>();
    @Output() downloadClick = new EventEmitter<void>();
    @Output() logoutClick = new EventEmitter<void>();

    displayName = 'Usuario';
    initials = 'U';
    sessionDuration = 0;
    tokenExpirationTime = 0;
    isAuthenticated = false;
    private sessionCheckInterval: any;
    private refreshCheckInterval: any;

    ngOnInit(): void {
        // Verificar estado inicial
        this.updateSessionStatus();
        
        // Configurar verificación periódica cada minuto
        this.sessionCheckInterval = setInterval(() => {
            this.updateSessionStatus();
        }, 60000); // 60 segundos
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                const user = JSON.parse(raw);
                const nameCandidates = [
                    user?.name,
                    user?.nombre,
                    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
                    user?.username,
                    user?.email
                ].filter((v: string | undefined) => !!v && String(v).trim().length > 0) as string[];

                const picked = nameCandidates[0] ?? 'Usuario';
                this.displayName = String(picked).trim();
                this.initials = this.computeInitials(this.displayName);
            }
        } catch {
            this.displayName = 'Usuario';
            this.initials = 'U';
        }
    }

    onToggleMenu() {
        this.menuToggle.emit();
    }
    logout(): void {
        this.authService.logout();
    }

    private computeInitials(name: string): string {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        const first = parts[0]?.charAt(0) ?? 'U';
        const last = parts[parts.length - 1]?.charAt(0) ?? '';
        return (first + last).toUpperCase();
    }

    private updateSessionStatus(): void {
        this.isAuthenticated = this.authService.isAuthenticated();
        this.sessionDuration = this.authService.getSessionDuration();
        this.tokenExpirationTime = this.authService.getTokenExpirationTime();
    }

    getSessionStatusClass(): string {
        if (!this.isAuthenticated) return 'text-danger';
        return 'text-success';
    }

    getSessionStatusText(): string {
        if (!this.isAuthenticated) return 'Desconectado';
        return 'Conectado';
    }

    getFormattedTokenExpiration(): string {
        if (!this.isAuthenticated) return '0min';
        
        // Si no hay tiempo de expiración, obtenerlo del servicio
        if (this.tokenExpirationTime <= 0) {
            this.tokenExpirationTime = this.authService.getTokenExpirationTime();
        }
        
        if (this.tokenExpirationTime <= 0) return '0min';
        
        const hours = Math.floor(this.tokenExpirationTime / 60);
        const minutes = this.tokenExpirationTime % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else {
            return `${minutes}min`;
        }
    }

    ngOnDestroy(): void {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
    }
}