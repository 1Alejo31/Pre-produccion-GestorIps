import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import Swal from 'sweetalert2';
import { RegisterHojaVidaService } from '../../admin/HojaVida/hoja.service';
import { PsicologiaGestionService } from './psicologia-gestion.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-psicologia-gestion',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './psicologia-gestion.html',
    styleUrls: ['./psicologia-gestion.css']
})


export class PsicologiaGestion implements OnInit, OnDestroy {
    user: any = null;
    isSupervisorPsico = false;
    isPsicologo = false;

    isLoadingHojas = false;
    // ===== estados de “Mis Casos Tomados” =====
    isLoadingCasos = false;
    casosTomadosExistentes: any[] = [];
    casosTomadosFiltrados: any[] = [];
    searchTermCasos = '';
    currentPageCasos = 1;
    itemsPerPageCasos = 10;
    totalItemsCasos = 0;
    // ===== estados de “Consulta de Hojas de Vida” =====
    isLoadingConsulta = false;
    hojasVidaExistentes: any[] = [];
    hojasVidaFiltradas: any[] = [];
    searchTerm = '';
    currentPage = 1;
    itemsPerPage = 10;
    totalItems = 0;
    hojasVida: any[] = [];
    casosTomados: any[] = [];

    formulario = {
        paciente: '',
        motivoConsulta: '',
        observaciones: ''
    };
    isSaving = false;

    // Control de pestañas (igual patrón que IPS Gestión)
    activeTab: 'consulta' | 'casos' | 'formulario' | 'notificacion' | 'preguntas' | 'preguntas_activas' = 'consulta';

    // Formulario Notificación
    notificacion = { asunto: '', mensaje: '' };
    adjuntoPdf: File | null = null;
    adjuntoPdfUrl: string | null = null;
    adjuntoPdfSafeUrl: SafeResourceUrl | null = null;
    notificacionAdjuntoUrl: string | null = null; // URL for existing notification PDF
    enviandoNotificacion = false;

    constructor(
        private auth: AuthService,
        private psicoService: PsicologiaGestionService,
        private sanitizer: DomSanitizer
    ) { }

    // Modelo de entrevista psicológica
    entrevista = {
        aspirante: '',
        ciudadRegistro: '',
        edad: '',
        general: [] as { pregunta: string; respuesta: 'SI' | 'NO' | 'NO APLICA'; ampliacion: string; enviarConcepto: boolean }[],
        ampliacionFamiliar: [] as { pregunta: string; respuesta: 'SI' | 'NO' | 'NO APLICA'; ampliacion: string; enviarConcepto: boolean }[],
    };

    ngOnDestroy(): void {
        // Clean up blob URLs to prevent memory leaks
        if (this.adjuntoPdfUrl) {
            try { URL.revokeObjectURL(this.adjuntoPdfUrl); } catch {}
        }
        if (this.adjuntoPdfSafeUrl) {
            try { 
                const url = (this.adjuntoPdfSafeUrl as any)?.changingThisBreaksApplicationSecurity;
                if (url) URL.revokeObjectURL(url); 
            } catch {}
        }
    }

    ngOnInit(): void {
        this.user = this.auth.getUserInfo();
        const perfil = (this.user?.perfil || '').toLowerCase();
        this.isSupervisorPsico = perfil === 'supervisor_psicologia' || perfil === 'administrador';
        this.isPsicologo = perfil === 'psicologo' || perfil === 'supervisor_psicologia' || perfil === 'administrador';

        // Pestaña inicial
        this.activeTab = this.isSupervisorPsico ? 'consulta' : 'casos';

        // Preguntas por defecto (como en la imagen)
        this.entrevista.general = [
            { pregunta: '¿Se ha presentado con anterioridad a la Escuela Militar?', respuesta: 'NO', ampliacion: '', enviarConcepto: false },
            { pregunta: '¿Se ha presentado usted a cualquier otra Escuela de Formación?', respuesta: 'NO', ampliacion: '', enviarConcepto: false },
        ];
        this.entrevista.ampliacionFamiliar = [
            { pregunta: 'Indagar con quien vive el aspirante, edad y ocupación de cada...', respuesta: 'NO APLICA', ampliacion: '', enviarConcepto: false },
            { pregunta: 'Tipo de relación padres?', respuesta: 'NO APLICA', ampliacion: '', enviarConcepto: false },
        ];

        // Cargar datos al iniciar si es supervisor y la pestaña inicial es consulta
        if (this.isSupervisorPsico && this.activeTab === 'consulta') {
            this.consultarHojasDeVida();
        }
    }

    setActiveTab(tab: 'consulta' | 'casos' | 'formulario' | 'notificacion' | 'preguntas' | 'preguntas_activas'): void {
        this.activeTab = tab;

        if (tab === 'consulta' && this.isSupervisorPsico) {
            this.consultarHojasDeVida();
        }

        if (tab === 'casos') {
            this.consultarMisCasosTomados();
        }

        if (tab === 'preguntas_activas') {
            this.consultarPreguntasActivas();
        }

        if (tab === 'formulario') {
            this.cargarPreguntasFormulario();
            this.cargarAspirantesBase();
        }

        if (tab === 'notificacion') {
            this.cargarNotificacionExistente();
        }
    }

    consultarHojasDeVida(): void {
        if (!this.isSupervisorPsico) return;
        this.isLoadingConsulta = true;

        this.psicoService.consultarHojasVida().subscribe({
            next: (response) => {
                this.isLoadingConsulta = false;
                if (response.error === 0) {
                    this.hojasVidaExistentes = response.response?.data || [];
                    this.totalItems = this.hojasVidaExistentes.length;
                    this.filtrarHojasVida();

                    if (this.hojasVidaExistentes.length === 0) {
                        Swal.fire({
                            icon: 'info',
                            title: 'Sin datos',
                            text: 'No se encontraron hojas de vida registradas'
                        });
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.response?.mensaje || response.mensaje || 'Error al consultar las hojas de vida'
                    });
                }
            },
            error: (error) => {
                this.isLoadingConsulta = false;
                if (error.status === 401 || !this.auth.getToken?.()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Sesión requerida',
                        text: 'Debes iniciar sesión para acceder a esta función.',
                        timer: 3000,
                        showConfirmButton: false
                    });
                    if (this.auth.handleAuthError) this.auth.handleAuthError();
                    return;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al consultar las hojas de vida: ' + (error.error?.message || error.message)
                });
            }
        });
    }

    filtrarHojasVida(): void {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            this.hojasVidaFiltradas = [...this.hojasVidaExistentes];
        } else {
            this.hojasVidaFiltradas = this.hojasVidaExistentes.filter(hoja =>
                hoja.DOCUMENTO?.toString().toLowerCase().includes(term) ||
                hoja.NOMBRE?.toLowerCase().includes(term) ||
                hoja.PRIMER_APELLIDO?.toLowerCase().includes(term) ||
                hoja.CORREO?.toLowerCase().includes(term) ||
                hoja.CIUDAD?.toLowerCase().includes(term)
            );
        }
        this.currentPage = 1;
    }

    // NUEVO: paginación para “Consulta de Hojas de Vida”
    get hojasVidaPaginadas(): any[] {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.hojasVidaFiltradas.slice(startIndex, endIndex);
    }

    get totalPages(): number {
        return Math.ceil(this.hojasVidaFiltradas.length / this.itemsPerPage);
    }

    get paginasArray(): number[] {
        return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    cambiarPagina(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
    }

    // NUEVO: clase visual según estado
    getBadgeClass(estado: string): string {
        if (!estado) return 'bg-secondary';
        const e = estado
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace('concentimiento', 'consentimiento');
    
        // Mapeo de colores (sin text-dark)
        if (e.includes('gestion')) return 'bg-warning';
        if (e === 'activo') return 'bg-danger';
        if (e.includes('consentimiento recibido')) return 'bg-success';
        if (e.includes('consentimiento enviado')) return 'bg-info';
    
        return 'bg-secondary';
    }

    getNotificacionBadgeClass(estadoNotif: string): string {
        console.log('[DEBUG] getNotificacionBadgeClass called with:', estadoNotif);
        const e = (estadoNotif || '').toString().trim().toUpperCase();
        console.log('[DEBUG] Processed estado:', e);
        if (!e) return 'bg-primary';
        if (e === 'TOMADO POR PSICOLOGIA') return 'bg-success';
        if (e === 'GESTIONANDO NOTIFICACION') return 'bg-warning';
        return 'bg-primary';
    }

    // NUEVO: ver detalle completo (igual a Gestor Hoja de Vida, con sección PDF)
    verDetalleHoja(hoja: any): void {
        const estadoClass = this.getBadgeClass(hoja?.ESTADO);

        let html = '<div class="text-start" style="font-family: Arial, sans-serif;">';

        // Header con estado
        html += `<div class="d-flex align-items-center mb-3">`;
        html += `<h5 class="mb-0 me-3">Detalle de Hoja de Vida</h5>`;
        html += `<span class="badge estado-badge ${estadoClass}"><span class="me-1">●</span>${hoja?.ESTADO ?? 'N/A'}</span>`;
        if (hoja?.ESTADO_NOTIFICACION) {
            html += `<span class="badge estado-badge bg-primary ms-2"><span class="me-1">●</span>${hoja.ESTADO_NOTIFICACION}</span>`;
        }
        if (hoja?.H_ESTADO_NOTIFICACION_CONSENTIMIENTO) {
            html += `<span class="badge estado-badge bg-info text-dark ms-2"><span class="me-1">●</span>${hoja.H_ESTADO_NOTIFICACION_CONSENTIMIENTO}</span>`;
        }
        html += `</div>`;

        // Información Personal
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-primary text-white"><strong>📋 Información Personal</strong></div>';
        html += '<div class="card-body"><div class="row">';
        const personalFields = [
            { key: 'DOCUMENTO', label: '🆔 Documento' },
            { key: 'NOMBRE', label: '👤 Nombre' },
            { key: 'PRIMER_APELLIDO', label: '👤 Primer Apellido' },
            { key: 'SEGUNDO_APELLIDO', label: '👤 Segundo Apellido' },
            { key: 'EDAD', label: '🎂 Edad' },
            { key: 'GENERO', label: '⚧ Género' },
            { key: 'FECH_NACIMIENTO', label: '📅 Fecha de Nacimiento' }
        ];
        personalFields.forEach(f => {
            const v = hoja?.[f.key] ?? 'N/A';
            if (v !== 'N/A' && v !== '' && v != null) {
                html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">${f.label}:</strong><br><span class="text-dark" style="font-size:1.1em;">${v}</span></div>`;
            }
        });
        html += '</div></div></div>';

        // Información de Contacto
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-info text-white"><strong>📞 Información de Contacto</strong></div>';
        html += '<div class="card-body"><div class="row">';
        const contactFields = [
            { key: 'CORREO', label: '📧 Correo Electrónico' },
            { key: 'TELEFONO', label: '📞 Teléfono' },
            { key: 'CELULAR', label: '📱 Celular' },
            { key: 'DIRECCION', label: '🏠 Dirección' }
        ];
        contactFields.forEach(f => {
            const v = hoja?.[f.key] ?? 'N/A';
            if (v !== 'N/A' && v !== '' && v != null) {
                html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">${f.label}:</strong><br><span class="text-dark" style="font-size:1.1em;">${v}</span></div>`;
            }
        });
        html += '</div></div></div>';

        // Información Académica y Ubicación
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-success text-white"><strong>🎓 Información Académica y Ubicación</strong></div>';
        html += '<div class="card-body"><div class="row">';
        const academicFields = [
            { key: 'CODIPROGACAD', label: '🎓 Programa Académico' },
            { key: 'ANNOPERIACAD', label: '📅 Año Período Académico' },
            { key: 'NUMEPERIACAD', label: '🔢 Número Período Académico' },
            { key: 'CIUDAD', label: '🏙️ Ciudad' },
            { key: 'DEPARTAMENTO', label: '🗺️ Departamento' },
            { key: 'REGIONAL', label: '🏢 Regional' },
            { key: 'COLEGIO', label: '🏫 Colegio' }
        ];
        academicFields.forEach(f => {
            const v = hoja?.[f.key] ?? 'N/A';
            if (v !== 'N/A' && v !== '' && v != null) {
                html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">${f.label}:</strong><br><span class="text-dark" style="font-size:1.1em;">${v}</span></div>`;
            }
        });
        html += '</div></div></div>';

        // Información Adicional
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-warning text-dark"><strong>ℹ️ Información Adicional</strong></div>';
        html += '<div class="card-body"><div class="row">';
        const additionalFields = [
            { key: 'CODIGO_INSCRIPCION', label: '🎫 Código de Inscripción' },
            { key: 'FECHA_INSCRIPCION', label: '📅 Fecha de Inscripción' },
            { key: 'ESTRATO', label: '🏘️ Estrato' },
            { key: 'GRUP_MINO', label: '👥 Grupo Minoritario' },
            { key: 'TIPO_MEDIO', label: '📺 Tipo de Medio' },
            { key: 'COMPLEMENTARIA_1', label: '📝 Info Complementaria 1' },
            { key: 'COMPLEMENTARIA_2', label: '📝 Info Complementaria 2' }
        ];
        additionalFields.forEach(f => {
            const v = hoja?.[f.key] ?? 'N/A';
            if (v !== 'N/A' && v !== '' && v != null) {
                html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">${f.label}:</strong><br><span class="text-dark" style="font-size:1.1em;">${v}</span></div>`;
            }
        });
        html += '</div></div></div>';

        // Información Médica (si existe)
        if (hoja?.EXAMENES || hoja?.FECHA_HORA || hoja?.RECOMENDACIONES || hoja?.IPS_ID || hoja?.NOMBREIPS) {
            html += '<div class="card mb-3 shadow">';
            html += '<div class="card-header bg-danger text-white"><strong>🏥 Información Médica</strong></div>';
            html += '<div class="card-body"><div class="row">';
            const medicalFields = [
                { key: 'EXAMENES', label: '🔬 Exámenes' },
                { key: 'FECHA_HORA', label: '📅 Fecha y Hora', isDateTime: true },
                { key: 'IPS_ID', label: '🏥 ID IPS' },
                { key: 'NOMBREIPS', label: '🏥 Nombre IPS' }
            ];
            medicalFields.forEach(f => {
                let v: any = hoja?.[f.key] ?? 'N/A';
                if (v !== 'N/A' && v !== '' && v != null) {
                    if (f.isDateTime) v = this.formatearFecha(v);
                    html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">${f.label}:</strong><br><span class="text-dark" style="font-size:1.1em;">${v}</span></div>`;
                }
            });
            if (hoja?.RECOMENDACIONES) {
                html += `<div class="col-12 mb-2 p-2"><strong class="text-muted">💊 Recomendaciones:</strong><br><div class="alert alert-info mt-2" style="font-size:1.1em;">${hoja.RECOMENDACIONES}</div></div>`;
            }
            html += '</div></div></div>';
        }

        // Información de Reunión (si existe)
        if (hoja?.TIPO_REUNION || hoja?.DETALLE_REUNION || hoja?.FECHA_HORA_CITA_PSICOLOGIA) {
            html += '<div class="card mb-3 shadow">';
            html += '<div class="card-header bg-primary text-white"><strong>📅 Reunión Psicología</strong></div>';
            html += '<div class="card-body"><div class="row">';
            const reunionFields = [
                { key: 'TIPO_REUNION', label: '📌 Tipo de Reunión' },
                { key: 'DETALLE_REUNION', label: '📝 Detalle de Reunión' }
            ];
            reunionFields.forEach(f => {
                const v = hoja?.[f.key] ?? 'N/A';
                if (v !== 'N/A' && v !== '' && v != null) {
                    html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">${f.label}:</strong><br><span class="text-dark" style="font-size:1.1em;">${v}</span></div>`;
                }
            });
            if (hoja?.FECHA_HORA_CITA_PSICOLOGIA) {
                const v = this.formatearFecha(hoja.FECHA_HORA_CITA_PSICOLOGIA);
                html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">📅 Fecha Cita Psicología:</strong><br><span class="text-dark" style="font-size:1.1em;">${v}</span></div>`;
            }
            html += '</div></div></div>';
        }

        // Información del Sistema
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-secondary text-white"><strong>🔑 Información del Sistema</strong></div>';
        html += '<div class="card-body"><div class="row">';
        const systemFields = [
            { key: 'PKEYHOJAVIDA', label: '🔑 ID Hoja de Vida' },
            { key: 'PKEYASPIRANT', label: '🔑 ID Aspirante' },
            { key: 'USUARIO_ID', label: '👤 Usuario ID' },
            { key: 'createdAt', label: '📅 Fecha de Creación', isDate: true },
            { key: 'updatedAt', label: '📅 Última Actualización', isDate: true }
        ];
        systemFields.forEach(f => {
            let v: any = hoja?.[f.key] ?? 'N/A';
            if (v !== 'N/A' && v !== '' && v != null) {
                if (f.isDate) v = this.formatearFecha(v);
                html += `<div class="col-md-6 mb-2 p-2"><strong class="text-muted">${f.label}:</strong><br><span class="text-dark" style="font-size:1.1em;font-family:monospace;">${v}</span></div>`;
            }
        });
        if (hoja?.DETALLE) {
            html += `<div class="col-12 mb-2 p-2"><strong class="text-muted">📋 Detalle de Procesamiento:</strong><br><div class="alert alert-secondary mt-2" style="font-size:0.9em;font-family:monospace;">${hoja.DETALLE}</div></div>`;
        }
        html += '</div></div></div>';

        // Sección PDF (cuando existe)
        if (hoja?.PDF_URL) {
            html += '<div class="card mb-3 shadow">';
            html += '<div class="card-header bg-info text-white"><h6 class="mb-0"><i class="fas fa-file-pdf me-2"></i>Documento PDF</h6></div>';
            html += '<div class="card-body text-center">';
            html += `<i class="fas fa-file-pdf text-danger" style="font-size:3rem;"></i>`;
            html += `<p class="mt-2 mb-3"><strong>Archivo PDF disponible</strong></p>`;
            html += `<button type="button" class="btn btn-primary btn-sm" id="verPdfBtn"><i class="fas fa-eye me-1"></i>Ver PDF</button>`;
            html += '</div></div>';
        }

        if (hoja?.RUTA_NOTIFICACION_RECIBIDA) {
            html += '<div class="card mb-3 shadow">';
            html += '<div class="card-header bg-primary text-white"><h6 class="mb-0"><i class="fas fa-file-pdf me-2"></i>Consentimiento recibido</h6></div>';
            html += '<div class="card-body text-center">';
            html += `<i class="fas fa-file-pdf text-primary" style="font-size:3rem;"></i>`;
            html += `<p class="mt-2 mb-3"><strong>Consentimiento PDF disponible</strong></p>`;
            html += `<button type="button" class="btn btn-primary btn-sm" id="verPdfNotiBtn"><i class="fas fa-eye me-1"></i>Ver PDF de Consentimiento</button>`;
            html += '</div></div>';
        }

        html += '</div>';

        Swal.fire({
            title: `${hoja?.NOMBRE ?? ''} ${hoja?.PRIMER_APELLIDO ?? ''} ${hoja?.SEGUNDO_APELLIDO ?? ''}`,
            html,
            icon: 'info',
            width: '900px',
            showCloseButton: true,
            confirmButtonText: 'Cerrar',
            customClass: { popup: 'swal-wide' },
            didOpen: () => {
                if (hoja?.PDF_URL) {
                    const verPdfBtn = document.getElementById('verPdfBtn');
                    if (verPdfBtn) verPdfBtn.onclick = () => this.verPDF(hoja.PDF_URL!);
                }
                if (hoja?.RUTA_NOTIFICACION_RECIBIDA) {
                    const verPdfNotiBtn = document.getElementById('verPdfNotiBtn');
                    if (verPdfNotiBtn) verPdfNotiBtn.onclick = () => this.verPDFNotificacion(hoja.RUTA_NOTIFICACION_RECIBIDA!);
                }
            }
        });
    }

    // Utilidad para fechas (como en Gestor HV)
    private formatearFecha(fecha: string): string {
        try {
            const d = new Date(fecha);
            return isNaN(d.getTime()) ? fecha : d.toLocaleString();
        } catch {
            return fecha;
        }
    }

    // tomar caso (usa asignarPsicologo del servicio)
    // Helper: obtiene el ID del caso desde distintas claves conocidas
    private getCasoId(hoja: any): string | null {
        const candidates = [
            hoja?.ID_CASO,
            hoja?.ID_HOJA_VIDA,
            hoja?.ID_HOJA,
            hoja?.ID,
            hoja?._id,
            hoja?.id
        ];
        const found = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== '');
        return found ? String(found) : null;
    }

    tomarCaso(hoja: any): void {
        const casoId = this.getCasoId(hoja);
        if (!casoId) {
            Swal.fire({
                icon: 'error',
                title: 'ID de caso no encontrado',
                text: 'No se encontró el identificador del caso en los datos. Verifica que la lista incluya ID_CASO/ID/ID_HOJA_VIDA.'
            });
            return;
        }

        Swal.fire({
            title: '¿Tomar este caso?',
            html: `<div class="text-start">
                    <p><strong>Documento:</strong> ${hoja?.DOCUMENTO ?? 'N/A'}</p>
                    </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, tomar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (!result.isConfirmed) return;

            Swal.fire({ title: 'Asignando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            this.psicoService.asignarPsicologo(casoId).subscribe({
                next: (resp) => {
                    Swal.close();
                    if (resp?.error === 0) {
                        Swal.fire({ icon: 'success', title: 'Caso asignado', text: resp?.response?.mensaje ?? 'El caso fue tomado correctamente.' });
                        if (this.activeTab === 'consulta') this.consultarHojasDeVida();
                        this.consultarMisCasosTomados();
                    } else {
                        Swal.fire({ icon: 'error', title: 'Error', text: resp?.response?.mensaje || resp?.mensaje || 'No se pudo asignar el caso.' });
                    }
                },
                error: (error) => {
                    Swal.close();
                    if (error?.status === 401) {
                        Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                        if (this.auth.handleAuthError) this.auth.handleAuthError();
                        return;
                    }
                    Swal.fire({ icon: 'error', title: 'Error', text: error?.error?.message || error?.message || 'Error en la asignación.' });
                }
            });
        });
    }

    // NUEVO: helpers del Formulario (coinciden con la plantilla)
    addGeneralPregunta(): void {
        this.entrevista.general.push({
            pregunta: '',
            respuesta: 'NO',
            ampliacion: '',
            enviarConcepto: false
        });
    }

    addAmpliacionPregunta(): void {
        this.entrevista.ampliacionFamiliar.push({
            pregunta: '',
            respuesta: 'NO APLICA',
            ampliacion: '',
            enviarConcepto: false
        });
    }

    guardarFormulario(): void {
        this.isSaving = true;
        // Simulación de guardado; reemplazar con llamada real si existe endpoint
        setTimeout(() => {
            this.isSaving = false;
            Swal.fire({ icon: 'success', title: 'Formulario guardado', text: 'Se guardó la información correctamente.' });
        }, 800);
    }

    consultarMisCasosTomados(): void {
        this.isLoadingCasos = true;

        this.psicoService.consultarCasosPorUsuarioSic().subscribe({
            next: (resp) => {
                this.isLoadingCasos = false;

                if (resp?.error === 0) {
                    const data = resp.response?.data ?? resp.response ?? resp.data ?? [];
                    this.casosTomadosExistentes = Array.isArray(data) ? data : [];
                    this.totalItemsCasos = this.casosTomadosExistentes.length;
                    this.filtrarCasosTomados();

                    if (this.casosTomadosExistentes.length === 0) {
                        Swal.fire({
                            icon: 'info',
                            title: 'Sin casos',
                            text: 'No se encontraron casos tomados para tu usuario.'
                        });
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: resp?.response?.mensaje || resp?.mensaje || 'Error al consultar tus casos.'
                    });
                }
            },
            error: (error) => {
                this.isLoadingCasos = false;
                if (error.status === 401) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Sesión requerida',
                        text: 'Tu sesión expiró. Inicia sesión nuevamente.'
                    });
                    if (this.auth.handleAuthError) this.auth.handleAuthError();
                    return;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al consultar tus casos: ' + (error.error?.message || error.message)
                });
            }
        });
    }

    filtrarCasosTomados(): void {
        const term = this.searchTermCasos.trim().toLowerCase();
        if (!term) {
            this.casosTomadosFiltrados = [...this.casosTomadosExistentes];
        } else {
            this.casosTomadosFiltrados = this.casosTomadosExistentes.filter(hoja =>
                hoja.DOCUMENTO?.toString().toLowerCase().includes(term) ||
                hoja.NOMBRE?.toLowerCase().includes(term) ||
                hoja.PRIMER_APELLIDO?.toLowerCase().includes(term) ||
                hoja.CORREO?.toLowerCase().includes(term) ||
                hoja.CIUDAD?.toLowerCase().includes(term)
            );
        }
        this.currentPageCasos = 1;
    }

    get casosTomadosPaginados(): any[] {
        const startIndex = (this.currentPageCasos - 1) * this.itemsPerPageCasos;
        const endIndex = startIndex + this.itemsPerPageCasos;
        return this.casosTomadosFiltrados.slice(startIndex, endIndex);
    }

    get totalPagesCasos(): number {
        return Math.ceil(this.casosTomadosFiltrados.length / this.itemsPerPageCasos);
    }

    get paginasArrayCasos(): number[] {
        return Array.from({ length: this.totalPagesCasos }, (_, i) => i + 1);
    }

    cambiarPaginaCasos(page: number): void {
        if (page < 1 || page > this.totalPagesCasos) return;
        this.currentPageCasos = page;
    }
    // Base del backend para PDFs directos (si se requiere abrir URL sin blob)
    private backendBaseUrl = 'http://3.142.186.227:3000';

    private resolvePdfUrl(url: string): string {
        const trimmed = (url || '').trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }
        if (trimmed.startsWith('/')) {
            return `${this.backendBaseUrl}${trimmed}`;
        }
        return `${this.backendBaseUrl}/${trimmed}`;
    }

    // Nuevo: abre PDF desde URL absoluta o nombre de archivo usando el servicio
    verPDF(pdfRef: string): void {
        const ref = (pdfRef || '').trim();
        const filename = ref.split('/').pop()?.split('?')[0];

        if (!filename) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo obtener el nombre del archivo PDF',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        Swal.fire({
            title: 'Cargando PDF...',
            text: 'Por favor espere mientras se carga el documento',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this.psicoService.obtenerPDF(filename).subscribe({
            next: (pdfBlob: Blob) => {
                const pdfBlobUrl = URL.createObjectURL(pdfBlob);
                Swal.close();

                const html = `
                    <div style="width: 100%; height: 80vh;">
                        <iframe src="${pdfBlobUrl}" style="width: 100%; height: 100%; border: none;" type="application/pdf"></iframe>
                    </div>
                `;
                Swal.fire({
                    title: 'Visualizador de PDF',
                    html,
                    width: '95%',
                    heightAuto: false,
                    showCloseButton: true,
                    showConfirmButton: true,
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6c757d',
                    customClass: { popup: 'swal-wide' },
                    willClose: () => {
                        try { URL.revokeObjectURL(pdfBlobUrl); } catch {}
                    }
                });
            },
            error: (err) => {
                console.error('Error obteniendo PDF', err);
                Swal.close();
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo cargar el PDF desde el servidor',
                    icon: 'error'
                });
            }
        });
    }

    verPDFNotificacion(pdfPath: string): void {
        const ref = (pdfPath || '').trim();
        const filename = ref.split('/').pop()?.split('?')[0];
        if (!filename) {
            Swal.fire({ title: 'Error', text: 'No se pudo obtener el nombre del archivo de notificación', icon: 'error' });
            return;
        }
        Swal.fire({ title: 'Cargando PDF...', text: 'Por favor espere mientras se carga el documento', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const renderBlob = (pdfBlob: Blob) => {
            const pdfBlobUrl = URL.createObjectURL(pdfBlob);
            Swal.close();
            const html = `
                <div style="width: 100%; height: 80vh;">
                    <iframe src="${pdfBlobUrl}" style="width: 100%; height: 100%; border: none;" type="application/pdf"></iframe>
                </div>
            `;
            Swal.fire({
                title: 'Visualizador de PDF',
                html,
                width: '95%',
                heightAuto: false,
                showCloseButton: true,
                showConfirmButton: true,
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#6c757d',
                customClass: { popup: 'swal-wide' },
                willClose: () => { try { URL.revokeObjectURL(pdfBlobUrl); } catch {} }
            });
        };

        this.psicoService.obtenerPDFNotificacionAuth(filename).subscribe({
            next: renderBlob,
            error: () => {
                this.psicoService.obtenerPDFNotificacion(filename).subscribe({
                    next: renderBlob,
                    error: () => {
                        this.psicoService.obtenerPDF(filename).subscribe({
                            next: renderBlob,
                            error: () => {
                                Swal.close();
                                const url = this.resolvePdfUrl(pdfPath);
                                const html = `
                                    <div style="width: 100%; height: 80vh;">
                                        <iframe src="${url}" style="width: 100%; height: 100%; border: none;" type="application/pdf"></iframe>
                                    </div>
                                `;
                                Swal.fire({ title: 'Visualizador de PDF', html, width: '95%', heightAuto: false });
                            }
                        });
                    }
                });
            }
        });
    }

    private verPDFDirect(pdfUrl: string): void {
        const resolvedUrl = this.resolvePdfUrl(pdfUrl);
        if (!resolvedUrl) {
            Swal.fire({
                title: 'Error',
                text: 'URL del PDF no válida',
                icon: 'error'
            });
            return;
        }
        const html = `
            <div style="width: 100%; height: 80vh;">
                <iframe src="${resolvedUrl}" style="width: 100%; height: 100%; border: none;" type="application/pdf"></iframe>
            </div>
        `;
        Swal.fire({
            title: 'Visualizador de PDF',
            html,
            width: '95%',
            heightAuto: false,
            showCloseButton: true,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#6c757d',
            customClass: { popup: 'swal-wide' }
        });
    }

    // Estado del formulario de notificación
    onNotificacionAdjuntoSelected(event: any): void {
        const file: File | undefined = event?.target?.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            Swal.fire({
                icon: 'error',
                title: 'Archivo no permitido',
                text: 'El adjunto debe ser un archivo PDF.'
            });
            event.target.value = '';
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            Swal.fire({
                icon: 'error',
                title: 'Archivo demasiado grande',
                text: 'El PDF debe pesar máximo 10 MB.'
            });
            event.target.value = '';
            return;
        }

        // Clean up any existing blob URLs first
        if (this.adjuntoPdfUrl) {
            try { URL.revokeObjectURL(this.adjuntoPdfUrl); } catch {}
        }
        
        // Clear existing notification URL when selecting a new file
        this.notificacionAdjuntoUrl = null;
        
        this.adjuntoPdf = file;
        this.adjuntoPdfUrl = URL.createObjectURL(file);
        this.adjuntoPdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.adjuntoPdfUrl);
    }

    removerAdjunto(): void {
        if (this.adjuntoPdfUrl) {
            try { URL.revokeObjectURL(this.adjuntoPdfUrl); } catch {}
        }
        this.adjuntoPdf = null;
        this.adjuntoPdfUrl = null;
        this.adjuntoPdfSafeUrl = null;
    }

    limpiarNotificacion(): void {
        if (this.adjuntoPdfUrl) {
            try { URL.revokeObjectURL(this.adjuntoPdfUrl); } catch {}
        }
        this.notificacion = { asunto: '', mensaje: '' };
        this.adjuntoPdf = null;
        this.adjuntoPdfUrl = null;
        this.adjuntoPdfSafeUrl = null;
        this.notificacionAdjuntoUrl = null; // Clear existing notification URL
    }

    enviarNotificacion(): void {
        if (!this.notificacion.asunto || !this.notificacion.mensaje || !this.adjuntoPdf) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Por favor completa Asunto, Mensaje y adjunta un PDF.'
            });
            return;
        }

        this.enviandoNotificacion = true;

        Swal.fire({
            title: 'Enviando notificación...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        this.psicoService.crearNotificacion(
            this.notificacion.asunto.trim(),
            this.notificacion.mensaje.trim(),
            this.adjuntoPdf!
        ).subscribe({
            next: (resp) => {
                this.enviandoNotificacion = false;
                Swal.close();

                const ok = resp?.error === 0 || resp?.success === true || !!resp?.response;
                const mensaje = resp?.response?.mensaje || resp?.mensaje || 'Notificación enviada correctamente.';
                if (ok) {
                    Swal.fire({ icon: 'success', title: 'Éxito', text: mensaje });
                    // this.limpiarNotificacion(); // Comentado para no limpiar el formulario después de enviar
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
                }
            },
            error: (error) => {
                this.enviandoNotificacion = false;
                Swal.close();
                if (error?.status === 401) {
                    Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                    if (this.auth.handleAuthError) this.auth.handleAuthError();
                    return;
                }
                const msg = error?.error?.response?.mensaje || error?.error?.mensaje || error?.message || 'Error al enviar la notificación.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    }

    enviarEstadoNotificacion(hoja: any): void {
        const casoId = this.getCasoId(hoja);
        if (!casoId) {
            Swal.fire({
                icon: 'error',
                title: 'ID de caso no encontrado',
                text: 'No se encontró el identificador del caso en los datos.'
            });
            return;
        }

        Swal.fire({ title: 'Enviando notificación...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        this.psicoService.gestionarEstadoNotificacion(casoId).subscribe({
            next: (resp) => {
                Swal.close();
                const ok = resp?.error === 0 || resp?.success === true || !!resp?.response;
                const mensaje = resp?.response?.mensaje || resp?.mensaje || 'Notificación gestionada correctamente.';
                if (ok) {
                    Swal.fire({ icon: 'success', title: 'Éxito', text: mensaje });
                    const estadoNuevo = typeof resp?.response?.estado_notificacion === 'string' && resp.response.estado_notificacion.trim() !== ''
                        ? resp.response.estado_notificacion.trim()
                        : null;
                    this.aplicarEstadoNotificacionLocal(casoId, estadoNuevo);
                    this.actualizarRegistroTrasGestion(casoId);
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
                }
            },
            error: (error) => {
                Swal.close();
                if (error?.status === 401) {
                    Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                    if (this.auth.handleAuthError) this.auth.handleAuthError();
                    return;
                }
                const msg = error?.error?.response?.mensaje || error?.error?.mensaje || error?.message || 'Error al gestionar la notificación.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    }

    private aplicarEstadoNotificacionLocal(casoId: string, estadoNuevo: string | null): void {
        const apply = (list: any[]) => {
            for (const item of list) {
                const candidates = [item?.ID_CASO, item?.ID_HOJA_VIDA, item?.ID_HOJA, item?.ID, item?._id, item?.id];
                const found = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== '' && String(v) === casoId);
                if (found) {
                    if (estadoNuevo && String(estadoNuevo).trim() !== '') {
                        item.ESTADO_NOTIFICACION = estadoNuevo;
                    }
                    break;
                }
            }
        };
        apply(this.hojasVidaExistentes);
        apply(this.hojasVidaFiltradas);
        apply(this.casosTomadosExistentes);
        apply(this.casosTomadosFiltrados);
    }

    private actualizarRegistroTrasGestion(casoId: string): void {
        this.psicoService.consultarCasosPorUsuarioSic().subscribe({
            next: (resp) => {
                const data = resp?.response?.data ?? resp?.response ?? resp?.data ?? [];
                const arr = Array.isArray(data) ? data : [];
                const actualizado = arr.find((h: any) => {
                    const id = this.getCasoId(h);
                    return id === casoId;
                });
                if (actualizado) {
                    this.replaceItemInLists(casoId, actualizado);
                }
            }
        });

        this.psicoService.consultarHojasVida().subscribe({
            next: (resp) => {
                const data = resp?.response?.data ?? resp?.response ?? resp?.data ?? [];
                const arr = Array.isArray(data) ? data : [];
                const actualizado = arr.find((h: any) => {
                    const id = this.getCasoId(h);
                    return id === casoId;
                });
                if (actualizado) {
                    this.replaceItemInLists(casoId, actualizado);
                }
            }
        });
    }

    private replaceItemInLists(casoId: string, actualizado: any): void {
        const replaceIn = (list: any[]) => {
            for (let i = 0; i < list.length; i++) {
                const id = this.getCasoId(list[i]);
                if (id === casoId) {
                    Object.assign(list[i], actualizado);
                    break;
                }
            }
        };
        replaceIn(this.hojasVidaExistentes);
        replaceIn(this.hojasVidaFiltradas);
        replaceIn(this.casosTomadosExistentes);
        replaceIn(this.casosTomadosFiltrados);
    }

    preguntasSecciones: { nombre: string; preguntas: { texto: string; tipo: 'SI_NO' | 'APLICA_NO_APLICA' | 'ABIERTA'; respuesta?: string }[] }[] = [
        { nombre: 'Sección 1', preguntas: [{ texto: '', tipo: 'SI_NO', respuesta: 'NO' }] }
    ];
    guardandoPreguntas = false;

    // Estado: Preguntas Activas
    isLoadingPreguntasActivas = false;
    preguntasActivasExistentes: any[] = [];
    preguntasActivasFiltradas: any[] = [];
    searchTermPreguntas = '';
    currentPagePreguntas = 1;
    itemsPerPagePreguntas = 10;
    totalItemsPreguntas = 0;
    addSeccion(): void {
        const idx = this.preguntasSecciones.length + 1;
        this.preguntasSecciones.push({ nombre: `Sección ${idx}`, preguntas: [{ texto: '', tipo: 'SI_NO', respuesta: 'NO' }] });
    }

    removeSeccion(i: number): void {
        if (i < 0 || i >= this.preguntasSecciones.length) return;
        this.preguntasSecciones.splice(i, 1);
    }

    addPregunta(si: number): void {
        const sec = this.preguntasSecciones[si];
        if (!sec) return;
        sec.preguntas.push({ texto: '', tipo: 'SI_NO', respuesta: 'NO' });
    }

    removePregunta(si: number, pi: number): void {
        const sec = this.preguntasSecciones[si];
        if (!sec) return;
        if (pi < 0 || pi >= sec.preguntas.length) return;
        sec.preguntas.splice(pi, 1);
    }

    getOpciones(tipo: 'SI_NO' | 'APLICA_NO_APLICA' | 'ABIERTA'): string[] {
        if (tipo === 'SI_NO') return ['SI', 'NO'];
        if (tipo === 'APLICA_NO_APLICA') return ['APLICA', 'NO APLICA'];
        return [];
    }

    guardarPreguntas(): void {
        const errores: string[] = [];
        const preguntas: { tipo: string; pregunta: string; estado: string }[] = [];

        if (!this.preguntasSecciones || this.preguntasSecciones.length === 0) {
            errores.push('Debes crear al menos una sección y una pregunta');
        }

        this.preguntasSecciones.forEach((sec, si) => {
            const nombreSec = (sec?.nombre || '').trim();
            if (!nombreSec) errores.push(`Nombre de sección #${si + 1} es obligatorio`);

            (sec?.preguntas || []).forEach((p, pi) => {
                const texto = (p?.texto || '').trim();
                const tipo = (p?.tipo || '').toString().trim();
                if (!texto) errores.push(`Texto de pregunta #${pi + 1} en sección #${si + 1} es obligatorio`);
                if (!tipo) errores.push(`Tipo de respuesta de pregunta #${pi + 1} en sección #${si + 1} es obligatorio`);
                if (nombreSec && texto && tipo) {
                    preguntas.push({ tipo: nombreSec, pregunta: texto, estado: 'activo' });
                }
            });
        });

        if (errores.length > 0) {
            Swal.fire({ icon: 'warning', title: 'Campos requeridos', html: `<ul style="text-align:left;">${errores.map(e => `<li>${e}</li>`).join('')}</ul>` });
            return;
        }

        if (preguntas.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Sin preguntas', text: 'Agrega al menos una pregunta válida.' });
            return;
        }

        this.guardandoPreguntas = true;
        Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        this.psicoService.crearPreguntasPsicologia(preguntas).subscribe({
            next: (resp) => {
                this.guardandoPreguntas = false;
                Swal.close();
                const ok = resp?.error === 0 || resp?.success === true || !!resp?.response;
                const mensaje = resp?.response?.mensaje || resp?.mensaje || 'Preguntas creadas correctamente.';
                if (ok) {
                    Swal.fire({ icon: 'success', title: 'Éxito', text: mensaje });
                    this.limpiarPreguntas();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
                }
            },
            error: (error) => {
                this.guardandoPreguntas = false;
                Swal.close();
                if (error?.status === 401) {
                    Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                    if (this.auth.handleAuthError) this.auth.handleAuthError();
                    return;
                }
                const msg = error?.error?.response?.mensaje || error?.error?.mensaje || error?.message || 'Error al crear las preguntas.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    }

    limpiarPreguntas(): void {
        this.preguntasSecciones = [
            { nombre: 'Sección 1', preguntas: [{ texto: '', tipo: 'SI_NO', respuesta: 'NO' }] }
        ];
    }

    formSecciones: { tipo: string; preguntas: { pregunta: string; respuesta: string; ampliacion: string }[] }[] = [];
    aspiranteSearchTerm = '';
    aspiranteEncontrado: any | null = null;

    private cargarPreguntasFormulario(): void {
        this.psicoService.consultarPreguntasPsicologiaActivas().subscribe({
            next: (resp) => {
                const data = resp?.response?.data ?? resp?.response ?? resp?.data ?? [];
                const arr = Array.isArray(data) ? data : [];
                const activas = arr.filter((p: any) => (p?.estado || '').toLowerCase() === 'activo');
                const grupos: Record<string, { pregunta: string; respuesta: string; ampliacion: string }[]> = {};
                activas.forEach((p: any) => {
                    const tipo = (p?.tipo || 'General').trim();
                    if (!grupos[tipo]) grupos[tipo] = [];
                    grupos[tipo].push({ pregunta: p?.pregunta || '', respuesta: 'NO', ampliacion: '' });
                });
                this.formSecciones = Object.keys(grupos).map(tipo => ({ tipo, preguntas: grupos[tipo] }));
            }
        });
    }

    private cargarAspirantesBase(): void {
        const needHojas = !this.hojasVidaExistentes || this.hojasVidaExistentes.length === 0;
        const needCasos = !this.casosTomadosExistentes || this.casosTomadosExistentes.length === 0;
        if (needHojas && this.consultarHojasDeVida) this.consultarHojasDeVida();
        if (needCasos) this.consultarMisCasosTomados();
    }

    private normalizarTexto(s: string): string {
        return (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/\s+/g, ' ').replace(/[\u0300-\u036f]/g, '');
    }

    searchAspirante(): void {
        const term = this.normalizarTexto(this.aspiranteSearchTerm);
        if (!term || term.length < 2) { this.aspiranteEncontrado = null; return; }
        const pool = [
            ...(this.casosTomadosExistentes || []),
            ...(this.hojasVidaExistentes || [])
        ];
        const found = pool.find((h: any) => {
            const doc = (h?.DOCUMENTO || '').toString().trim();
            const nombre = this.normalizarTexto(`${h?.NOMBRE || ''} ${h?.PRIMER_APELLIDO || ''} ${h?.SEGUNDO_APELLIDO || ''}`);
            return (doc && term === doc) || (nombre.includes(term));
        });
        this.aspiranteEncontrado = found || null;
    }

    private resolveAbsoluteUrl(path: string | null | undefined): string {
        const ref = (path || '').toString();
        if (!ref) return '';
        if (ref.startsWith('http')) return ref;
        const base = 'http://3.142.186.227:3000';
        // Don't normalize the path - use it as-is from the backend
        if (ref.startsWith('/')) {
            return `${base}${ref}`;
        }
        return `${base}/${ref}`;
    }

    cargarNotificacionExistente(): void {
        // Clean up any existing blob URLs first
        if (this.adjuntoPdfUrl) {
            try { URL.revokeObjectURL(this.adjuntoPdfUrl); } catch {}
            this.adjuntoPdfUrl = null;
        }
        
        this.psicoService.consultarNotificaciones().subscribe({
            next: (resp) => {
                const list = resp?.response?.notificaciones ?? resp?.notificaciones ?? [];
                const arr = Array.isArray(list) ? list : [];
                if (arr.length > 0) {
                    const n = arr[0];
                    this.notificacion = {
                        asunto: n?.asunto || '',
                        mensaje: n?.mensaje || ''
                    };
                    
                    // Extract just the filename for the PDF endpoints
                    const fullPath = n?.ruta_documento_adjunto || '';
                    console.log('[PDF Debug] Full path from API:', fullPath);
                    
                    // Extract filename from any format (full path or just filename)
                    const filename = fullPath.split('/').pop()?.split('?')[0] || '';
                    console.log('[PDF Debug] Extracted filename:', filename);
                    
                    if (filename) {
                        // Store the API endpoint URL instead of the direct file path
                        const apiUrl = `http://3.142.186.227:3000/api/pdf/notificacion/${filename}`;
                        this.notificacionAdjuntoUrl = apiUrl;
                        
                        console.log('[PDF Debug] Stored API endpoint URL:', apiUrl);
                        
                        // Download the PDF immediately for preview
                        this.descargarYMostrarPDFExistente(filename);
                    }
                }
            },
            error: (error) => {
                if (error?.status === 401 && this.auth?.handleAuthError) this.auth.handleAuthError();
            }
        });
    }

    private descargarYMostrarPDFExistente(filename: string): void {
        console.log('[PDF Debug] Starting PDF download for existing notification:', filename);
        
        // Try with authentication first
        this.psicoService.obtenerPDFNotificacionAuthCorrecto(filename).subscribe({
            next: (blob) => {
                console.log('[PDF Debug] Successfully downloaded PDF with auth, size:', blob.size);
                // Clean up any existing blob URL first
                if (this.adjuntoPdfUrl) {
                    try { URL.revokeObjectURL(this.adjuntoPdfUrl); } catch {}
                }
                this.adjuntoPdfUrl = URL.createObjectURL(blob);
                this.adjuntoPdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.adjuntoPdfUrl);
                console.log('[PDF Debug] Created blob URL for preview:', this.adjuntoPdfUrl);
            },
            error: (err) => {
                console.warn('[PDF Debug] Failed to download with auth, trying without auth:', err);
                // Try without authentication
                this.psicoService.obtenerPDFNotificacionCorrecto(filename).subscribe({
                    next: (blob2) => {
                        console.log('[PDF Debug] Successfully downloaded PDF without auth, size:', blob2.size);
                        // Clean up any existing blob URL first
                        if (this.adjuntoPdfUrl) {
                            try { URL.revokeObjectURL(this.adjuntoPdfUrl); } catch {}
                        }
                        this.adjuntoPdfUrl = URL.createObjectURL(blob2);
                        this.adjuntoPdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.adjuntoPdfUrl);
                        console.log('[PDF Debug] Created blob URL for preview:', this.adjuntoPdfUrl);
                    },
                    error: (err2) => {
                        console.error('[PDF Debug] Failed to download PDF without auth:', err2);
                        console.error('[PDF Debug] Unable to load existing PDF for preview');
                    }
                });
            }
        });
    }

    // Debug method to test PDF loading
    private debugPDFLoading(url: string, description: string): void {
        console.log(`[PDF Debug] ${description}:`, url);
        
        // Test if URL is accessible
        fetch(url, { method: 'HEAD' })
            .then(response => {
                console.log(`[PDF Debug] ${description} - Status:`, response.status, 'Content-Type:', response.headers.get('content-type'));
            })
            .catch(error => {
                console.error(`[PDF Debug] ${description} - Error:`, error);
            });
    }

    verNotificacionPDF(): void {
        let filename = '';
        
        // First try to get filename from the stored API URL
        if (this.notificacionAdjuntoUrl) {
            if (this.notificacionAdjuntoUrl.includes('/api/pdf/notificacion/')) {
                filename = this.notificacionAdjuntoUrl.split('/api/pdf/notificacion/').pop()?.split('?')[0] || '';
            } else {
                filename = this.notificacionAdjuntoUrl.split('/').pop()?.split('?')[0] || '';
            }
        }
        
        // If no filename from stored URL, try from current blob URL
        if (!filename && this.adjuntoPdfUrl) {
            // This is a blob URL, so we need to use the blob directly
            if (this.adjuntoPdfSafeUrl) {
                const html = `
                    <div style="width: 100%; height: 80vh;">
                        <iframe src="${this.adjuntoPdfUrl}" style="width: 100%; height: 100%; border: none;" type="application/pdf"></iframe>
                    </div>
                `;
                Swal.fire({ 
                    title: 'Visualizador de PDF', 
                    html, 
                    width: '95%', 
                    heightAuto: false, 
                    showCloseButton: true, 
                    confirmButtonText: 'Cerrar', 
                    confirmButtonColor: '#6c757d', 
                    customClass: { popup: 'swal-wide' }
                });
                return;
            }
        }
        
        console.log('[PDF Debug] verNotificacionPDF called with filename:', filename);
        
        if (!filename) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin PDF',
                text: 'No hay archivo PDF para visualizar'
            });
            return;
        }
        
        Swal.fire({ 
            title: 'Cargando PDF...', 
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });
        
        const render = (blob: Blob) => {
            console.log('[PDF Debug] Rendering PDF blob, size:', blob.size, 'type:', blob.type);
            const blobUrl = URL.createObjectURL(blob);
            console.log('[PDF Debug] Created blob URL:', blobUrl);
            const html = `
                <div style="width: 100%; height: 80vh;">
                    <iframe src="${blobUrl}" style="width: 100%; height: 100%; border: none;" type="application/pdf"></iframe>
                </div>
            `;
            Swal.fire({ 
                title: 'Visualizador de PDF', 
                html, 
                width: '95%', 
                heightAuto: false, 
                showCloseButton: true, 
                confirmButtonText: 'Cerrar', 
                confirmButtonColor: '#6c757d', 
                customClass: { popup: 'swal-wide' },
                willClose: () => {
                    console.log('[PDF Debug] Cleaning up blob URL');
                    try { URL.revokeObjectURL(blobUrl); } catch {}
                }
            });
        };
        
        // Try with authentication first
        this.psicoService.obtenerPDFNotificacionAuthCorrecto(filename).subscribe({
            next: (blob) => { 
                console.log('[PDF Debug] Successfully downloaded PDF with auth');
                Swal.close(); 
                render(blob); 
            },
            error: (err) => {
                console.warn('[PDF Debug] Failed to download PDF with auth, trying without auth:', err);
                // Try without authentication
                this.psicoService.obtenerPDFNotificacionCorrecto(filename).subscribe({
                    next: (blob2) => { 
                        console.log('[PDF Debug] Successfully downloaded PDF without auth');
                        Swal.close(); 
                        render(blob2); 
                    },
                    error: (err2) => {
                        console.warn('[PDF Debug] Failed to download PDF without auth:', err2);
                        Swal.close();
                        // Show error message instead of falling back to direct URL
                        Swal.fire({ 
                            icon: 'error',
                            title: 'Error al cargar PDF', 
                            text: 'No se pudo cargar el archivo PDF. Por favor, intente nuevamente.'
                        });
                    }
                });
            }
        });
    }

    consultarPreguntasActivas(): void {
        this.isLoadingPreguntasActivas = true;
        this.psicoService.consultarPreguntasPsicologiaActivas().subscribe({
            next: (resp) => {
                this.isLoadingPreguntasActivas = false;
                if (resp?.error === 0) {
                    const data = resp?.response?.data ?? resp?.response ?? resp?.data ?? [];
                    this.preguntasActivasExistentes = Array.isArray(data) ? data : [];
                    this.totalItemsPreguntas = this.preguntasActivasExistentes.length;
                    this.filtrarPreguntasActivas();
                } else {
                    const mensaje = resp?.response?.mensaje || resp?.mensaje || 'Error al consultar preguntas activas.';
                    Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
                }
            },
            error: (error) => {
                this.isLoadingPreguntasActivas = false;
                if (error?.status === 401) {
                    Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                    if (this.auth.handleAuthError) this.auth.handleAuthError();
                    return;
                }
                const msg = error?.error?.response?.mensaje || error?.error?.mensaje || error?.message || 'Error al consultar preguntas activas.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    }

    filtrarPreguntasActivas(): void {
        const term = (this.searchTermPreguntas || '').trim().toLowerCase();
        if (!term) {
            this.preguntasActivasFiltradas = [...this.preguntasActivasExistentes];
        } else {
            this.preguntasActivasFiltradas = this.preguntasActivasExistentes.filter(p =>
                p.tipo?.toLowerCase().includes(term) ||
                p.pregunta?.toLowerCase().includes(term) ||
                p.estado?.toLowerCase().includes(term) ||
                (typeof p.id_usuario_creacion === 'string' && p.id_usuario_creacion.toLowerCase().includes(term))
            );
        }
        this.currentPagePreguntas = 1;
    }

    get preguntasActivasPaginadas(): any[] {
        const startIndex = (this.currentPagePreguntas - 1) * this.itemsPerPagePreguntas;
        const endIndex = startIndex + this.itemsPerPagePreguntas;
        return this.preguntasActivasFiltradas.slice(startIndex, endIndex);
    }

    get totalPagesPreguntas(): number {
        return Math.ceil(this.preguntasActivasFiltradas.length / this.itemsPerPagePreguntas);
    }

    get paginasArrayPreguntas(): number[] {
        return Array.from({ length: this.totalPagesPreguntas }, (_, i) => i + 1);
    }

    cambiarPaginaPreguntas(page: number): void {
        if (page < 1 || page > this.totalPagesPreguntas) return;
        this.currentPagePreguntas = page;
    }

    verPreguntasActivasModal(): void {
        Swal.fire({ title: 'Consultando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this.psicoService.consultarPreguntasPsicologiaActivas().subscribe({
            next: (resp) => {
                Swal.close();
                const ok = resp?.error === 0;
                if (!ok) {
                    const mensaje = resp?.response?.mensaje || resp?.mensaje || 'Error al consultar preguntas activas.';
                    Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
                    return;
                }
                const data = resp?.response?.data ?? [];
                const rows = Array.isArray(data) ? data : [];
                this.preguntasActivasExistentes = rows;
                this.filtrarPreguntasActivas();

                let html = '';
                html += '<div class="row mb-4">';
                html += '<div class="col-md-6 d-flex align-items-center">';
                html += '<div class="info-section">';
                html += '<h6 class="mb-1" style="color: #b3945b"><i class="fas fa-chart-bar me-2"></i>Registros Encontrados</h6><br />';
                html += `<div class="d-flex align-items-center"><span class="badge fs-6 me-2" style="background-color: #b3945b">${this.preguntasActivasFiltradas.length}</span><span class="text-muted">preguntas activas</span></div>`;
                html += '</div></div>';
                html += '<div class="col-md-6">';
                html += '<label class="form-label text-muted mb-2"><i class="fas fa-search me-1"></i>Buscar registros</label>';
                html += '<div class="search-container">';
                html += '<div class="input-group input-group-lg">';
                html += '<span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-primary"></i></span>';
                html += '<input id="searchPregAct" type="text" class="form-control border-start-0 ps-0" placeholder="Tipo o texto de la pregunta..." />';
                html += '</div></div></div></div>';

                html += '<div class="table-container">';
                html += '<div class="table-responsive">';
                html += '<table class="table table-striped table-hover table-sm">';
                html += '<thead class="table-dark sticky-top"><tr><th>Tipo</th><th>Pregunta</th><th>Estado</th><th class="text-center">Acciones</th></tr></thead>';
                html += '<tbody id="pregActBody">';
                html += this.renderPreguntasActivasRows();
                html += '</tbody></table></div>';
                html += '<nav aria-label="Paginación" id="pregActPagination">';
                html += this.renderPreguntasActivasPagination();
                html += '</nav></div>';

                // Card con header y body usando estilo existente
                const cardHtml = `
                    <div class="card shadow-lg border-0">
                        <div class="card-header text-white" style="background: linear-gradient(135deg, #B3945B 0%, #b3945b67 100%) !important;">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-list me-2"></i>
                                    <h5 class="mb-0">Preguntas Activas</h5>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">${html}</div>
                    </div>
                `;
                Swal.fire({
                    title: '',
                    html: cardHtml,
                    width: '1100px',
                    customClass: { popup: 'swal-wide' },
                    showCloseButton: true,
                    confirmButtonText: 'Cerrar',
                    didOpen: () => {
                        const input = document.getElementById('searchPregAct') as HTMLInputElement | null;
                        if (input) {
                            input.value = this.searchTermPreguntas;
                            input.oninput = () => {
                                this.searchTermPreguntas = input.value;
                                this.filtrarPreguntasActivas();
                                this.updatePreguntasActivasModalViews();
                            };
                        }
                        const nav = document.getElementById('pregActPagination');
                        if (nav) {
                            nav.onclick = (e) => {
                                const t = e.target as HTMLElement;
                                const btn = t.closest('button[data-page]') as HTMLButtonElement | null;
                                if (btn) {
                                    const page = parseInt(btn.getAttribute('data-page') || '1', 10);
                                    this.cambiarPaginaPreguntas(page);
                                    this.updatePreguntasActivasModalViews();
                                }
                            };
                        }
                        const body = document.getElementById('pregActBody');
                        if (body) {
                            body.onclick = (e) => {
                                const t = e.target as HTMLElement;
                                const btn = t.closest('button[data-action]') as HTMLButtonElement | null;
                                if (btn) {
                                    const id = btn.getAttribute('data-id') || '';
                                    const action = btn.getAttribute('data-action') || '';
                                    if (action !== 'desactivar') return;
                                    const nuevoEstado: 'activo' | 'inactivo' = 'inactivo';
                                    const item = this.preguntasActivasExistentes.find(p => String(p?._id) === id);
                                    if (!id || !item) return;

                                    btn.disabled = true;
                                    Swal.showLoading();
                                    this.psicoService.actualizarEstadoPregunta(id, nuevoEstado).subscribe({
                                        next: (resp) => {
                                            Swal.close();
                                            const ok = resp?.error === 0 || resp?.success === true || !!resp?.response;
                                            const mensaje = resp?.response?.mensaje || resp?.mensaje || 'Estado actualizado correctamente.';
                                            if (ok) {
                                                item.estado = nuevoEstado;
                                                this.filtrarPreguntasActivas();
                                                this.updatePreguntasActivasModalViews();
                                                Swal.fire({ icon: 'success', title: 'Éxito', text: mensaje, timer: 1200, showConfirmButton: false });
                                            } else {
                                                Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
                                            }
                                            btn.disabled = false;
                                        },
                                        error: (error) => {
                                            Swal.close();
                                            btn.disabled = false;
                                            if (error?.status === 401) {
                                                Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                                                if (this.auth.handleAuthError) this.auth.handleAuthError();
                                                return;
                                            }
                                            const msg = error?.error?.response?.mensaje || error?.error?.mensaje || error?.message || 'Error al actualizar el estado.';
                                            Swal.fire({ icon: 'error', title: 'Error', text: msg });
                                        }
                                    });
                                }
                            };
                        }
                    }
                });
            },
            error: (error) => {
                Swal.close();
                if (error?.status === 401) {
                    Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                    if (this.auth.handleAuthError) this.auth.handleAuthError();
                    return;
                }
                const msg = error?.error?.response?.mensaje || error?.error?.mensaje || error?.message || 'Error al consultar preguntas activas.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    }

    private renderPreguntasActivasRows(): string {
        return this.preguntasActivasPaginadas.map(p => {
            const estadoClass = p?.estado === 'activo' ? 'bg-success' : 'bg-secondary';
            return `<tr>
                <td>${p?.tipo ?? ''}</td>
                <td>${p?.pregunta ?? ''}</td>
                <td><span class="badge estado-badge ${estadoClass}">${p?.estado ?? ''}</span></td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-action btn-outline-danger btn-sm d-inline-flex align-items-center justify-content-center" data-action="desactivar" data-id="${p?._id ?? ''}">Desactivar</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    private renderPreguntasActivasPagination(): string {
        if (this.totalPagesPreguntas <= 1) return '';
        let html = '<ul class="pagination pagination-custom mb-0">';
        const prevDisabled = this.currentPagePreguntas === 1 ? 'disabled' : '';
        html += `<li class="page-item ${prevDisabled}"><button class="page-link" data-page="${this.currentPagePreguntas - 1}">Anterior</button></li>`;
        this.paginasArrayPreguntas.forEach(page => {
            const active = this.currentPagePreguntas === page ? 'active' : '';
            html += `<li class="page-item ${active}"><button class="page-link" data-page="${page}">${page}</button></li>`;
        });
        const nextDisabled = this.currentPagePreguntas === this.totalPagesPreguntas ? 'disabled' : '';
        html += `<li class="page-item ${nextDisabled}"><button class="page-link" data-page="${this.currentPagePreguntas + 1}">Siguiente</button></li>`;
        html += '</ul>';
        return html;
    }

    private updatePreguntasActivasModalViews(): void {
        const body = document.getElementById('pregActBody');
        const pag = document.getElementById('pregActPagination');
        if (body) body.innerHTML = this.renderPreguntasActivasRows();
        if (pag) pag.innerHTML = this.renderPreguntasActivasPagination();
        const countBadge = document.querySelector('.info-section .badge.fs-6');
        if (countBadge) countBadge.textContent = String(this.preguntasActivasFiltradas.length);
    }

    agendarCita(hoja: any): void {
        const nombre = `${hoja?.NOMBRE ?? ''} ${hoja?.PRIMER_APELLIDO ?? ''}${hoja?.SEGUNDO_APELLIDO ? ' ' + hoja.SEGUNDO_APELLIDO : ''}`.trim();
        const html = `
            <div class="container-fluid">
                <form id="agendamientoForm">
                    <div class="mb-3">
                        <label for="fechaHora" class="form-label text-start d-block">
                            <i class="fas fa-calendar-alt me-2"></i>Fecha y Hora de Agendamiento
                        </label>
                        <input type="datetime-local" id="fechaHora" class="form-control" required />
                    </div>
                    <div class="mb-3">
                        <label for="modoSelect" class="form-label text-start d-block">
                            <i class="fas fa-video me-2"></i> Modalidad
                        </label>
                        <select id="modoSelect" class="form-select" required>
                            <option value="">Seleccione</option>
                            <option value="virtual">Virtual</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <div class="mb-3" id="campoUrl" style="display:none;">
                        <label for="examenes" class="form-label text-start d-block">
                            <i class="fas fa-stethoscope me-2"></i>Url de reunión
                        </label>
                        <textarea id="examenes" class="form-control" rows="2" placeholder="Pegue la URL de la reunión..." maxlength="500"></textarea>
                        <small class="text-muted">Ejemplo: https://meet.google.com/xxxx-xxxx-xxx</small>
                    </div>
                    <div class="mb-3" id="campoUbicacion" style="display:none;">
                        <label for="ubicacion" class="form-label text-start d-block">
                            <i class="fas fa-map-marker-alt me-2"></i> Ubicación
                        </label>
                        <textarea id="ubicacion" class="form-control" rows="2" placeholder="Escriba la dirección o lugar de la reunión..." maxlength="300"></textarea>
                        <small class="text-muted">Ejemplo: Calle 123 #45-67, Consultorio 2</small>
                    </div>
                </form>
            </div>
        `;

        Swal.fire({
            title: `Agendar Cita - ${nombre || 'Paciente'}`,
            html,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'Agendar Cita',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            didOpen: () => {
                const popup = Swal.getPopup()!;
                const modoSel = popup.querySelector('#modoSelect') as HTMLSelectElement | null;
                const campoUrlWrap = popup.querySelector('#campoUrl') as HTMLDivElement | null;
                const campoUrl = popup.querySelector('#examenes') as HTMLTextAreaElement | null;
                const campoUbic = popup.querySelector('#campoUbicacion') as HTMLDivElement | null;
                const toggle = () => {
                    const val = modoSel?.value || '';
                    if (campoUrlWrap) campoUrlWrap.style.display = val === 'virtual' ? '' : 'none';
                    if (campoUbic) campoUbic.style.display = val === 'presencial' ? '' : 'none';
                    if (campoUrl) campoUrl.required = val === 'virtual';
                    const ubic = popup.querySelector('#ubicacion') as HTMLTextAreaElement | null;
                    if (ubic) ubic.required = val === 'presencial';
                };
                if (modoSel) {
                    modoSel.onchange = toggle;
                    toggle();
                }
            },
            preConfirm: () => {
                const popup = Swal.getPopup()!;
                const fechaHora = (popup.querySelector('#fechaHora') as HTMLInputElement)?.value || '';
                const examenes = (popup.querySelector('#examenes') as HTMLTextAreaElement)?.value || '';
                const ubicacion = (popup.querySelector('#ubicacion') as HTMLTextAreaElement)?.value || '';
                const modo = (popup.querySelector('#modoSelect') as HTMLSelectElement)?.value || '';
                const errores: string[] = [];
                if (!fechaHora) errores.push('Fecha y hora es obligatoria');
                if (!modo) errores.push('Modalidad es obligatoria');
                if (modo === 'virtual') {
                    if (!examenes.trim()) errores.push('Url de reunión es obligatoria');
                } else {
                    if (!ubicacion.trim()) errores.push('Ubicación es obligatoria');
                }
                if (errores.length) {
                    Swal.showValidationMessage(errores.join('\n'));
                    return null as any;
                }
                return { fechaHora, examenUrl: examenes.trim(), ubicacion: ubicacion.trim(), modalidad: modo };
            }
        }).then((res) => {
            if (!res.isConfirmed || !res.value) return;
            const { fechaHora, examenUrl, ubicacion, modalidad } = res.value as { fechaHora: string; examenUrl: string; ubicacion: string; modalidad: 'virtual' | 'presencial' };
            const casoId = this.getCasoId(hoja);
            const tipoReunion = modalidad === 'virtual' ? 'Virtual' : 'Presencial';
            const detalle = modalidad === 'virtual' ? `URL: ${examenUrl}` : `Ubicación: ${ubicacion}`;
            Swal.showLoading();
            if (!casoId) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontró el identificador del caso.' });
                return;
            }
            this.psicoService.gestionarReunion(casoId, tipoReunion, fechaHora, detalle).subscribe({
                next: (resp) => {
                    Swal.close();
                    const ok = resp?.error === 0 || resp?.success === true || !!resp?.response;
                    const mensaje = resp?.response?.mensaje || resp?.mensaje || 'Reunión gestionada correctamente.';
                    if (ok) {
                        if (casoId) {
                            const apply = (list: any[]) => {
                                for (const item of list) {
                                    const id = this.getCasoId(item);
                                    if (id === casoId) {
                                        item.FECHA_HORA = fechaHora;
                                        if (modalidad === 'virtual') {
                                            item.URL_REUNION = examenUrl;
                                            delete item.UBICACION;
                                        } else {
                                            item.UBICACION = ubicacion;
                                            delete item.URL_REUNION;
                                        }
                                        break;
                                    }
                                }
                            };
                            apply(this.casosTomadosExistentes);
                            apply(this.casosTomadosFiltrados);
                            this.actualizarRegistroTrasGestion(casoId);
                        }
                        Swal.fire({ icon: 'success', title: 'Éxito', text: mensaje });
                    } else {
                        Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
                    }
                },
                error: (error) => {
                    Swal.close();
                    if (error?.status === 401) {
                        Swal.fire({ icon: 'warning', title: 'Sesión requerida', text: 'Tu sesión expiró. Inicia sesión nuevamente.' });
                        if (this.auth.handleAuthError) this.auth.handleAuthError();
                        return;
                    }
                    const msg = error?.error?.response?.mensaje || error?.error?.mensaje || error?.message || 'Error al gestionar la reunión.';
                    Swal.fire({ icon: 'error', title: 'Error', text: msg });
                }
            });
        });
    }
}