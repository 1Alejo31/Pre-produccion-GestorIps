import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
    selector: 'app-aplicaciones',
    standalone: true,
    imports: [CommonModule, HttpClientModule],
    templateUrl: './aplicaciones.html',
    styleUrls: ['./aplicaciones.css']
})
export class Aplicaciones implements OnInit {
    activeTab: string = 'whatsapp-bot';
    whatsappUrl: SafeResourceUrl;
    mensajesEnviados: number = 0;
    private apiUrl = 'http://3.142.186.227:3000/api/hojas-vida/bot/procesados';

    constructor(private sanitizer: DomSanitizer, private http: HttpClient) {
        this.whatsappUrl = this.sanitizer.bypassSecurityTrustResourceUrl('http://3.142.186.227:3010/');
    }

    ngOnInit(): void {
        // Cargar estadísticas al inicializar
        this.actualizarEstadisticas();
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;
    }

    updateWhatsappUrl(url: string): void {
        this.whatsappUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    actualizarEstadisticas(): void {
        this.http.get<any>(this.apiUrl).subscribe({
            next: (response) => {
                if (response.error === 0 && response.response) {
                    this.mensajesEnviados = response.response.data || 0;
                }
            },
            error: (error) => {
                console.error('Error al obtener estadísticas:', error);
                this.mensajesEnviados = 0;
            }
        });
    }
}