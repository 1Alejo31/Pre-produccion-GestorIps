import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class GestorIpsService {
    private apiUrl = 'http://52.15.143.100:3000/api/ips/consultar';

    constructor(private http: HttpClient) { }

    consultarIps(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        });
        
        return this.http.get<any>(this.apiUrl, { headers }).pipe(
            catchError((error: HttpErrorResponse) => {
                // Si el error tiene un cuerpo de respuesta JSON válido, lo retornamos como éxito
                if (error.error && typeof error.error === 'object' && error.error.hasOwnProperty('error')) {
                    return new Observable(observer => {
                        observer.next(error.error);
                        observer.complete();
                    });
                }
                // Si no es un error estructurado del servidor, lo tratamos como error de conexión
                return throwError(() => error);
            })
        );
    }
}