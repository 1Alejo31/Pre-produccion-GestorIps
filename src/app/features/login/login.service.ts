import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';

@Injectable({
    providedIn: 'root'
})
export class LoginService {
    private apiUrl = 'http://3.142.186.227:3000/api/auth/login';
    private refreshUrl = 'http://3.142.186.227:3000/api/auth/refresh';
    //private apiUrl = 'http://localhost:3000/api/auth/login';
    //private refreshUrl = 'http://localhost:3000/api/auth/refresh';

    constructor(private http: HttpClient) {}

    loginService(credentials: { email: string, password: string }): Observable<any> {
        return this.http.post<any>(this.apiUrl, credentials);
    }

    refreshToken(): Observable<any> {
        const token = localStorage.getItem('token');
        return this.http.post<any>(this.refreshUrl, {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    encryptAES = (text: string, key: string) => {
        return CryptoJS.AES.encrypt(text, key).toString();
    };
}