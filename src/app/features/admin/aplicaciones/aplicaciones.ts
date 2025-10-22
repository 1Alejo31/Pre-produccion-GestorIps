import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-aplicaciones',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './aplicaciones.html',
    styleUrls: ['./aplicaciones.css']
})
export class Aplicaciones implements OnInit {
    activeTab = 'whatsapp-bot';
    whatsappUrl: SafeResourceUrl;

    constructor(private sanitizer: DomSanitizer) {
        this.whatsappUrl = this.sanitizer.bypassSecurityTrustResourceUrl('http://3.142.186.227:3010/');
    }

    ngOnInit(): void {
        // Inicialización del componente
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;
    }

    updateWhatsappUrl(url: string): void {
        this.whatsappUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}