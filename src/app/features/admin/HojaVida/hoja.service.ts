import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';

@Injectable({
    providedIn: 'root'
})
export class RegisterHojaVidaService {
    private apiUrl = 'http://3.142.186.227:3000/api/hojas-vida/';
    private consultarUrl = 'http://3.142.186.227:3000/api/hojas-vida/consultar';
    //private apiUrl = 'http://localhost:3000/api/hojas-vida/';
    //private consultarUrl = 'http://localhost:3000/api/hojas-vida/hojas-vida-full';

    constructor(private http: HttpClient) { }

    // Registro individual
    register(hojaVida: any): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.post<any>(`${this.apiUrl}crear`, hojaVida, { headers });
    }

    // Registro masivo
    registerBulk(hojasVida: any[]): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.post<any>(`${this.apiUrl}crear`, hojasVida, { headers });
    }

    // Consultar todas las hojas de vida
    consultarHojasVida(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        return this.http.get<any>(this.consultarUrl, { headers });
    }

    validateHojaVida(hojaVida: any): { isValid: boolean, errors: string[] } {
        const errors: string[] = [];
        const requiredFields = [
            { field: 'PKEYHOJAVIDA', name: 'ID Hoja de Vida' },
            { field: 'PKEYASPIRANT', name: 'ID Aspirante' },
            { field: 'CODIPROGACAD', name: 'Programa Académico' },
            { field: 'DOCUMENTO', name: 'Documento' },
            { field: 'NOMBRE', name: 'Nombre' },
            { field: 'PRIMER_APELLIDO', name: 'Primer Apellido' },
            { field: 'EDAD', name: 'Edad' },
            { field: 'GENERO', name: 'Género' },
            { field: 'FECH_NACIMIENTO', name: 'Fecha de Nacimiento' },
            { field: 'CORREO', name: 'Correo' },
            { field: 'CELULAR', name: 'Celular' },
            { field: 'DIRECCION', name: 'Dirección' },
            { field: 'CIUDAD', name: 'Ciudad' },
            { field: 'ESTADO', name: 'Estado' },
            { field: 'DEPARTAMENTO', name: 'Departamento' },
            { field: 'REGIONAL', name: 'Regional' },
            { field: 'FECHA_INSCRIPCION', name: 'Fecha de Inscripción' },
            { field: 'ESTRATO', name: 'Estrato' },
            { field: 'TIPO_MEDIO', name: 'Tipo de Medio' },
            { field: 'COLEGIO', name: 'Colegio' }
        ];

        requiredFields.forEach(({ field, name }) => {
            if (!hojaVida[field] || hojaVida[field].toString().trim() === '') {
                errors.push(`${name} es requerido`);
            }
        });

        // Validaciones específicas
        if (hojaVida.CORREO && !this.isValidEmail(hojaVida.CORREO)) {
            errors.push('El formato del correo no es válido');
        }

        if (hojaVida.EDAD && (hojaVida.EDAD < 16 || hojaVida.EDAD > 35)) {
            errors.push('La edad debe estar entre 16 y 35 años');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    encryptAES = (text: string, key: string) => {
        return CryptoJS.AES.encrypt(text, key).toString();
    };
}