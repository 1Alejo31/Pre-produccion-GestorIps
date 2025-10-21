import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';

@Injectable({
    providedIn: 'root'
})
export class RegisterService {
    private apiUrl = 'http://52.15.143.100:3000/api/users/register';
    private ipsApiUrl = 'http://localhost:3000/api/ips/consultar';

    constructor(private http: HttpClient) {}

    register(payload: { persona: any, credenciales: any }): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
        });
        return this.http.post<any>(this.apiUrl, payload, { headers });
    }

    consultarIps(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
        });
        return this.http.get<any>(this.ipsApiUrl, { headers });
    }

    encryptAES = (text: string, key: string) => {
        return CryptoJS.AES.encrypt(text, key).toString();
    };
}