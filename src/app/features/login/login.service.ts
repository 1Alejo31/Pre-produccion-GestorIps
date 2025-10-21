import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';

@Injectable({
    providedIn: 'root'
})
export class LoginService {
    //private apiUrl = 'http://52.15.143.100:3000/api/auth/login';
    private apiUrl = 'http://localhost:3000/api/auth/login';

    constructor(private http: HttpClient) {}

    loginService(credentials: { email: string, password: string }): Observable<any> {
        return this.http.post<any>(this.apiUrl, credentials);
    }

    encryptAES = (text: string, key: string) => {
        return CryptoJS.AES.encrypt(text, key).toString();
    };
}