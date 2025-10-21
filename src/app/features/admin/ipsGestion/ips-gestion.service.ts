import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class IpsGestionService {
    private apiUrl = 'http://52.15.143.100:3000/api/hojas-vida';

    constructor(private http: HttpClient) { }

    consultarHojasVida(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        });

        return this.http.get<any>(`${this.apiUrl}/consultar`, { headers }).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.error && typeof error.error === 'object' && error.error.hasOwnProperty('error')) {
                    return new Observable(observer => {
                        observer.next(error.error);
                        observer.complete();
                    });
                }
                return throwError(() => error);
            })
        );
    }

    agendarCita(datosAgendamiento: any): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        });


        return this.http.put<any>(`${this.apiUrl}/agendar`, datosAgendamiento, { headers }).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.error && typeof error.error === 'object' && error.error.hasOwnProperty('error')) {
                    return new Observable(observer => {
                        observer.next(error.error);
                        observer.complete();
                    });
                }
                return throwError(() => error);
            })
        );
    }

    consultarCasosTomados(ipsId: string): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        });

        const payload = {
            ips_id: ipsId
        };

        return this.http.post<any>(`${this.apiUrl}/por_ips`, payload, { headers }).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.error && typeof error.error === 'object' && error.error.hasOwnProperty('error')) {
                    return new Observable(observer => {
                        observer.next(error.error);
                        observer.complete();
                    });
                }
                return throwError(() => error);
            })
        );
    }

    cargarPDF(hojaVidaId: string, pdfFile: File): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
        });

        const formData = new FormData();
        formData.append('id', hojaVidaId);
        formData.append('token', token);
        formData.append('pdf', pdfFile);

        return this.http.put<any>('http://localhost:3000/api/pdf/pdf', formData, { headers }).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.error && typeof error.error === 'object' && error.error.hasOwnProperty('error')) {
                    return new Observable(observer => {
                        observer.next(error.error);
                        observer.complete();
                    });
                }
                return throwError(() => error);
            })
        );
    }

    obtenerPDF(filename: string): Observable<Blob> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        return this.http.get(`http://localhost:3000/api/pdf/pdf/${filename}`, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError((error: HttpErrorResponse) => {
                return throwError(() => error);
            })
        );
    }
}