import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PsicologiaGestionService {
    private baseApi = 'http://3.142.186.227:3000/api';
    private consultarUrl = `${this.baseApi}/hojas-vida/sin_usuario_sic`;
    private asignarUrl = `${this.baseApi}/hojas-vida/asignar_psicologo`;
    private crearNotificacionUrl = `${this.baseApi}/notificaciones/crear`;
    private gestionarEstadoNotificacionUrl = `${this.baseApi}/hojas-vida/estado_notificacion/gestionar`;
    private crearPreguntasUrl = `${this.baseApi}/preguntas_psicologia/crear`;
    private preguntasActivasUrl = `${this.baseApi}/preguntas_psicologia/activas`;
    private actualizarEstadoPreguntaUrl = `${this.baseApi}/preguntas_psicologia/actualizar-estado`;
    private reunionGestionarUrl = `${this.baseApi}/hojas-vida/reunion/gestionar`;
    private consultarNotificacionesUrl = `${this.baseApi}/notificaciones/consultar`;

    constructor(private http: HttpClient) {}

    consultarHojasVida(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.get<any>(this.consultarUrl, { headers });
    }

    asignarPsicologo(casoId: string): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const userRaw = localStorage.getItem('user');
        const usuarioSic = userRaw ? (JSON.parse(userRaw).id ?? '') : '';

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const body = { id: casoId, USUARIO_SIC: usuarioSic };
        return this.http.put<any>(this.asignarUrl, body, { headers });
    }

    consultarCasosPorUsuarioSic(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const userRaw = localStorage.getItem('user');
        const usuarioSic = userRaw ? (JSON.parse(userRaw).id ?? '') : '';

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const body = { USUARIO_SIC: usuarioSic };
        return this.http.post<any>(`${this.baseApi}/hojas-vida/por_usuario_sic`, body, { headers });
    }

    obtenerPDF(filename: string): Observable<Blob> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

        return this.http.get(`${this.baseApi}/pdf/pdf/${filename}`, {
            headers,
            responseType: 'blob'
        });
    }

    obtenerPDFNotificacionCorrecto(filename: string): Observable<Blob> {
        return this.http.get(`http://3.142.186.227:3000/api/pdf/recibida/${filename}`, {
            responseType: 'blob'
        });
    }

    obtenerPDFNotificacionAuthCorrecto(filename: string): Observable<Blob> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.get(`http://3.142.186.227:3000/api/pdf/recibida/${filename}`, {
            headers,
            responseType: 'blob'
        });
    }

    crearNotificacion(asunto: string, mensaje: string, adjunto: File): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const userRaw = localStorage.getItem('user');
        let usuarioId = '';
        try {
            const parsed = userRaw ? JSON.parse(userRaw) : null;
            usuarioId = parsed?.response?.id ?? parsed?.id ?? '';
        } catch {
            usuarioId = '';
        }

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
        });

        const formData = new FormData();
        formData.append('id_usuario', String(usuarioId));
        formData.append('asunto', asunto);
        formData.append('mensaje', mensaje);
        formData.append('archivo', adjunto, adjunto.name);

        return this.http.post<any>(this.crearNotificacionUrl, formData, { headers });
    }

    gestionarEstadoNotificacion(casoId: string): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        const body = { id: casoId };
        return this.http.put<any>(this.gestionarEstadoNotificacionUrl, body, { headers });
    }

    obtenerPDFNotificacion(filename: string): Observable<Blob> {
        return this.http.get(`http://3.142.186.227:3000/api/pdf/recibida/${filename}`, {
            responseType: 'blob'
        });
    }

    obtenerPDFNotificacionAuth(filename: string): Observable<Blob> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.get(`http://3.142.186.227:3000/api/pdf/recibida/${filename}`, {
            headers,
            responseType: 'blob'
        });
    }

    crearPreguntasPsicologia(preguntas: Array<{ tipo: string; pregunta: string; estado: string }>): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const userRaw = localStorage.getItem('user');
        let usuarioId = '';
        try {
            const parsed = userRaw ? JSON.parse(userRaw) : null;
            usuarioId = parsed?.id ?? parsed?.response?.id ?? '';
        } catch {
            usuarioId = '';
        }

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const body = {
            id_usuario_creacion: String(usuarioId),
            preguntas
        };

        return this.http.post<any>(this.crearPreguntasUrl, body, { headers });
    }

    consultarPreguntasPsicologiaActivas(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.get<any>(this.preguntasActivasUrl, { headers });
    }

    actualizarEstadoPregunta(id_pregunta: string, estado: 'activo' | 'inactivo'): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const userRaw = localStorage.getItem('user');
        let usuarioId = '';
        try {
            const parsed = userRaw ? JSON.parse(userRaw) : null;
            usuarioId = parsed?.id ?? parsed?.response?.id ?? '';
        } catch {
            usuarioId = '';
        }

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const body = {
            id_pregunta: String(id_pregunta),
            estado,
            id_usuario_actualiza: String(usuarioId)
        };

    return this.http.put<any>(this.actualizarEstadoPreguntaUrl, body, { headers });
    }

    gestionarReunion(id_caso: string, tipo_reunion: 'Virtual' | 'Presencial', fecha_hora: string, detalle_reunion: string): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const userRaw = localStorage.getItem('user');
        let usuarioId = '';
        try {
            const parsed = userRaw ? JSON.parse(userRaw) : null;
            usuarioId = parsed?.id ?? parsed?.response?.id ?? '';
        } catch {
            usuarioId = '';
        }

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const body = {
            id_caso: String(id_caso),
            id_usuario: String(usuarioId),
            fecha_hora,
            tipo_reunion,
            detalle_reunion
        };

        return this.http.put<any>(this.reunionGestionarUrl, body, { headers });
    }

    consultarNotificaciones(): Observable<any> {
        const token = localStorage.getItem('token') ?? '';
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.get<any>(this.consultarNotificacionesUrl, { headers });
    }

    descargarArchivoAbsoluto(absoluteUrl: string, useAuth = false): Observable<Blob> {
        // Extract filename from the full URL
        const filename = absoluteUrl.split('/').pop()?.split('?')[0] || '';
        
        if (!filename) {
            throw new Error('No se pudo extraer el nombre del archivo de la URL');
        }

        console.log('[PDF Service] Downloading file:', filename, 'with auth:', useAuth);
        
        // Try to use the specific PDF endpoints first
        if (useAuth) {
            return this.obtenerPDFNotificacionAuth(filename);
        } else {
            return this.obtenerPDFNotificacion(filename);
        }
    }
}