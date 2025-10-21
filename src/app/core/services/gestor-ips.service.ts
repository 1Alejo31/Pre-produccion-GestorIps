import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class GestorIpsService {
    private apiUrl = 'http://3.142.186.227:3000/api/ips';

    constructor(private http: HttpClient) { }

    consultarIps(): Observable<any> {
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

    registrarIps(ipsData: any): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        });
        
        return this.http.post<any>(`${this.apiUrl}/crearIps`, ipsData, { headers }).pipe(
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

    exportarExcel(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
        });
        
        return this.http.get(`${this.apiUrl}/exportarExcel`, { 
            headers, 
            responseType: 'blob' 
        }).pipe(
            catchError((error: HttpErrorResponse) => {
                return throwError(() => error);
            })
        );
    }
}