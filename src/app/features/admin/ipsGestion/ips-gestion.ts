import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IpsGestionService } from './ips-gestion.service';
import { AuthService } from '../../../core/auth.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

interface HojaVida {
    _id: string;
    PKEYHOJAVIDA: string;
    PKEYASPIRANT: string;
    CODIPROGACAD: string;
    ANNOPERIACAD: number;
    NUMEPERIACAD: string;
    CODIGO_INSCRIPCION: string;
    DOCUMENTO: string;
    NOMBRE: string;
    PRIMER_APELLIDO: string;
    SEGUNDO_APELLIDO: string;
    EDAD: number;
    GENERO: string;
    FECH_NACIMIENTO: string;
    CORREO: string;
    TELEFONO: string;
    CELULAR: string;
    DIRECCION: string;
    CIUDAD: string;
    ESTADO: string;
    DEPARTAMENTO: string;
    REGIONAL: string;
    COMPLEMENTARIA_1: string;
    COMPLEMENTARIA_2: string;
    FECHA_INSCRIPCION: string;
    GRUP_MINO: string;
    ESTRATO: string;
    TIPO_MEDIO: string;
    COLEGIO: string;
    // Nuevos campos para casos tomados
    EXAMENES?: string;
    FECHA_HORA?: string;
    IPS_ID?: string;
    RECOMENDACIONES?: string;
    USUARIO_ID?: string;
    NOMBREIPS?: string;
    PDF_URL?: string;
    createdAt: string;
    updatedAt: string;
}

@Component({
    selector: 'app-ips-gestion',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './ips-gestion.html',
    styleUrls: ['./ips-gestion.css']
})
export class IpsGestion implements OnInit {

    activeTab = 'consulta';

    // Propiedades para la gestión de hojas de vida
    hojasVida: HojaVida[] = [];
    hojasVidaFiltradas: HojaVida[] = [];
    isLoadingConsulta = false;
    searchTerm = '';
    currentPage = 1;
    itemsPerPage = 10;
    totalItems = 0;

    // Propiedades para casos tomados
    casosTomados: HojaVida[] = [];
    casosTomadosFiltrados: HojaVida[] = [];
    isLoadingCasos = false;
    searchTermCasos = '';
    currentPageCasos = 1;
    itemsPerPageCasos = 10;
    totalItemsCasos = 0;

    // Propiedades para modal de PDF
    selectedCaso: HojaVida | null = null;
    selectedPdfFile: File | null = null;
    pdfPreviewUrl: string | null = null;
    isLoadingPdf = false;

    // Formulario de agendamiento
    agendamientoForm!: FormGroup;
    isLoadingAgendamiento = false;

    Math = Math;

    constructor(
        private ipsGestionService: IpsGestionService,
        private fb: FormBuilder,
        private authService: AuthService
    ) {
        this.initializeAgendamientoForm();
    }

    ngOnInit(): void {
        this.consultarHojasVida();
    }

    private initializeAgendamientoForm(): void {
        this.agendamientoForm = this.fb.group({
            fechaHora: ['', [Validators.required]],
            examenes: ['', [Validators.required, Validators.maxLength(500)]],
            recomendaciones: ['', [Validators.required, Validators.maxLength(500)]]
        });
    }

    setActiveTab(tab: string) {
        this.activeTab = tab;
        if (tab === 'consulta') {
            this.consultarHojasVida();
        } else if (tab === 'casos') {
            this.consultarCasosTomados();
        }
    }

    consultarHojasVida() {
        this.isLoadingConsulta = true;
        this.ipsGestionService.consultarHojasVida().subscribe({
            next: (response) => {
                this.isLoadingConsulta = false;

                if (response.error === 0) {
                    this.hojasVida = response.response.hojas_vida || [];
                    this.totalItems = response.response.total_registros || 0;
                    this.filtrarHojasVida();
                } else {
                    console.error('Error en la respuesta:', response);
                    Swal.fire({
                        title: 'Error',
                        text: response.response?.mensaje || 'Error al consultar las hojas de vida',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                }
            },
            error: (error) => {
                this.isLoadingConsulta = false;
                console.error('Error al consultar hojas de vida:', error);

                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }

    filtrarHojasVida() {
        if (!this.searchTerm.trim()) {
            this.hojasVidaFiltradas = [...this.hojasVida];
        } else {
            const termino = this.searchTerm.toLowerCase();
            this.hojasVidaFiltradas = this.hojasVida.filter(hoja =>
                hoja.NOMBRE.toLowerCase().includes(termino) ||
                hoja.PRIMER_APELLIDO.toLowerCase().includes(termino) ||
                hoja.DOCUMENTO.toLowerCase().includes(termino) ||
                hoja.CORREO.toLowerCase().includes(termino) ||
                hoja.CIUDAD.toLowerCase().includes(termino) ||
                hoja.DEPARTAMENTO.toLowerCase().includes(termino)
            );
        }
        this.currentPage = 1;
    }

    onSearchChange() {
        this.filtrarHojasVida();
    }

    get paginatedHojasVida() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.hojasVidaFiltradas.slice(startIndex, endIndex);
    }

    get totalPages() {
        return Math.ceil(this.hojasVidaFiltradas.length / this.itemsPerPage);
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    verDetalle(hoja: HojaVida) {
        let html = '<div class="container-fluid">';

        // Información Básica
        html += '<div class="card mb-3">';
        html += '<div class="card-header bg-primary text-white">';
        html += '<h6 class="mb-0"><i class="fas fa-user me-2"></i>Información Básica</h6>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const basicFields = [
            { key: 'DOCUMENTO', label: '🆔 Documento', value: hoja.DOCUMENTO },
            { key: 'NOMBRE', label: '👤 Nombre Completo', value: `${hoja.NOMBRE} ${hoja.PRIMER_APELLIDO} ${hoja.SEGUNDO_APELLIDO}`.trim() },
            { key: 'EDAD', label: '🎂 Edad', value: hoja.EDAD },
            { key: 'GENERO', label: '⚧ Género', value: hoja.GENERO },
            { key: 'FECH_NACIMIENTO', label: '📅 Fecha de Nacimiento', value: new Date(hoja.FECH_NACIMIENTO).toLocaleDateString('es-CO') },
            { key: 'ESTADO', label: '📊 Estado', value: hoja.ESTADO, isBadge: true }
        ];

        basicFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;

            if (field.isBadge) {
                const badgeClass = field.value === 'Activo' ? 'bg-success' : 'bg-danger';
                html += `<span class="badge ${badgeClass}" style="font-size: 1em;">${field.value}</span>`;
            } else {
                html += `<span class="text-dark" style="font-size: 1.1em; font-family: monospace;">${field.value || 'N/A'}</span>`;
            }
            html += `</div>`;
        });

        html += '</div></div></div>';

        // Información de Contacto
        html += '<div class="card mb-3">';
        html += '<div class="card-header bg-info text-white">';
        html += '<h6 class="mb-0"><i class="fas fa-address-book me-2"></i>Información de Contacto</h6>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const contactFields = [
            { key: 'CORREO', label: '📧 Correo Electrónico', value: hoja.CORREO },
            { key: 'TELEFONO', label: '📞 Teléfono', value: hoja.TELEFONO },
            { key: 'CELULAR', label: '📱 Celular', value: hoja.CELULAR },
            { key: 'DIRECCION', label: '🏠 Dirección', value: hoja.DIRECCION },
            { key: 'CIUDAD', label: '🏙️ Ciudad', value: hoja.CIUDAD },
            { key: 'DEPARTAMENTO', label: '🗺️ Departamento', value: hoja.DEPARTAMENTO }
        ];

        contactFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="text-dark" style="font-size: 1.1em; font-family: monospace;">${field.value || 'N/A'}</span>`;
            html += `</div>`;
        });

        html += '</div></div></div>';

        // Información Académica
        html += '<div class="card mb-3">';
        html += '<div class="card-header bg-warning text-dark">';
        html += '<h6 class="mb-0"><i class="fas fa-graduation-cap me-2"></i>Información Académica</h6>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const academicFields = [
            { key: 'CODIGO_INSCRIPCION', label: '🎓 Código de Inscripción', value: hoja.CODIGO_INSCRIPCION },
            { key: 'CODIPROGACAD', label: '📚 Código Programa Académico', value: hoja.CODIPROGACAD },
            { key: 'ANNOPERIACAD', label: '📅 Año Período Académico', value: hoja.ANNOPERIACAD },
            { key: 'NUMEPERIACAD', label: '🔢 Número Período Académico', value: hoja.NUMEPERIACAD },
            { key: 'COLEGIO', label: '🏫 Colegio', value: hoja.COLEGIO },
            { key: 'FECHA_INSCRIPCION', label: '📝 Fecha de Inscripción', value: hoja.FECHA_INSCRIPCION }
        ];

        academicFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="text-dark" style="font-size: 1.1em; font-family: monospace;">${field.value || 'N/A'}</span>`;
            html += `</div>`;
        });

        html += '</div></div></div>';

        // Información Adicional
        html += '<div class="card mb-3">';
        html += '<div class="card-header bg-secondary text-white">';
        html += '<h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Información Adicional</h6>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const additionalFields = [
            { key: 'REGIONAL', label: '🌍 Regional', value: hoja.REGIONAL },
            { key: 'GRUP_MINO', label: '👥 Grupo Minoritario', value: hoja.GRUP_MINO },
            { key: 'ESTRATO', label: '🏘️ Estrato', value: hoja.ESTRATO },
            { key: 'TIPO_MEDIO', label: '📢 Tipo de Medio', value: hoja.TIPO_MEDIO },
            { key: 'COMPLEMENTARIA_1', label: '📋 Complementaria 1', value: hoja.COMPLEMENTARIA_1 },
            { key: 'COMPLEMENTARIA_2', label: '📋 Complementaria 2', value: hoja.COMPLEMENTARIA_2 }
        ];

        additionalFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="text-dark" style="font-size: 1.1em; font-family: monospace;">${field.value || 'N/A'}</span>`;
            html += `</div>`;
        });

        html += '</div></div></div>';

        // Información Médica (solo para casos tomados)
        if (hoja.EXAMENES || hoja.FECHA_HORA || hoja.RECOMENDACIONES || hoja.NOMBREIPS) {
            html += '<div class="card mb-3">';
            html += '<div class="card-header bg-success text-white">';
            html += '<h6 class="mb-0"><i class="fas fa-stethoscope me-2"></i>Información Médica</h6>';
            html += '</div>';
            html += '<div class="card-body">';
            html += '<div class="row">';

            const medicalFields = [
                { key: 'EXAMENES', label: '🔬 Exámenes', value: hoja.EXAMENES },
                { key: 'FECHA_HORA', label: '📅 Fecha y Hora', value: this.formatearFechaHora(hoja.FECHA_HORA) },
                { key: 'NOMBREIPS', label: '🏥 IPS', value: hoja.NOMBREIPS }
            ];

            medicalFields.forEach(field => {
                if (field.value && field.value !== 'N/A') {
                    html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
                    html += `<strong class="text-muted">${field.label}:</strong><br>`;
                    html += `<span class="text-dark" style="font-size: 1.1em; font-family: monospace;">${field.value}</span>`;
                    html += `</div>`;
                }
            });

            // Recomendaciones en una fila completa
            if (hoja.RECOMENDACIONES) {
                html += `<div class="col-12 mb-2 p-2" style="border-radius: 5px;">`;
                html += `<strong class="text-muted">💡 Recomendaciones:</strong><br>`;
                html += `<div class="alert alert-info mt-2" style="font-size: 1.1em;">${hoja.RECOMENDACIONES}</div>`;
                html += `</div>`;
            }

            html += '</div></div></div>';
        }

        // Sección de PDF (cuando existe PDF_URL)
        if (hoja.PDF_URL) {
            html += '<div class="card mb-3">';
            html += '<div class="card-header bg-info text-white">';
            html += '<h6 class="mb-0"><i class="fas fa-file-pdf me-2"></i>Documento PDF</h6>';
            html += '</div>';
            html += '<div class="card-body text-center">';

            // Extraer el nombre del archivo de la URL
            const filename = hoja.PDF_URL.split('/').pop();

            html += `<div class="mb-3">`;
            html += `<i class="fas fa-file-pdf text-danger" style="font-size: 3rem;"></i>`;
            html += `<p class="mt-2 mb-3"><strong>Archivo PDF disponible`;
            html += `<button type="button" class="btn btn-primary" onclick="window.open('data:application/pdf;base64,', '_blank')" id="verPdfBtn">`;
            html += `<i class="fas fa-eye me-2"></i>Ver PDF`;
            html += `</button>`;
            html += `</div>`;

            html += '</div></div>';
        }

        // Nuevo: Documento de Datos Biométricos
        if ((hoja as any)?.RUTA_BIOMETRIA && (hoja as any)?.RUTA_BIOMETRIA?.ruta) {
            const rutaBio = (hoja as any)?.RUTA_BIOMETRIA?.ruta || '';
            const fechaBio = (hoja as any)?.RUTA_BIOMETRIA?.fecha || '';
            html += '<div class="card mb-3">';
            html += '<div class="card-header bg-info text-white">';
            html += '<h6 class="mb-0"><i class="fas fa-fingerprint me-2"></i>Datos Biométricos</h6>';
            html += '</div>';
            html += '<div class="card-body text-center">';
            html += '<div class="mb-3">';
            html += '<i class="fas fa-file-pdf text-danger" style="font-size: 3rem;"></i>';
            html += `<p class="mt-2 mb-3"><strong>Archivo biométrico disponible</strong><br>`;
            if (fechaBio) {
                try {
                    const f = new Date(fechaBio).toLocaleString('es-CO');
                    html += `<small class="text-muted">Subido: ${f}</small>`;
                } catch {}
            }
            html += `</p>`;
            html += `<button type="button" class="btn btn-primary" id="verBiometriaBtn">`;
            html += `<i class="fas fa-eye me-2"></i>Ver Biometría`;
            html += `</button>`;
            html += '</div>';
            html += '</div></div>';
        }

        html += '</div>';

        Swal.fire({
            title: `Hoja de Vida - ${hoja.NOMBRE} ${hoja.PRIMER_APELLIDO}`,
            html: html,
            icon: 'info',
            width: '900px',
            showCloseButton: true,
            confirmButtonText: 'Cerrar',
            customClass: {
                popup: 'swal-wide'
            },
            didOpen: () => {
                // Si hay PDF, configurar el botón
                if (hoja.PDF_URL) {
                    const verPdfBtn = document.getElementById('verPdfBtn');
                    if (verPdfBtn) {
                        verPdfBtn.onclick = () => this.verPDF(hoja.PDF_URL!);
                    }
                }
                const verBioBtn = document.getElementById('verBiometriaBtn');
                if (verBioBtn) {
                    verBioBtn.onclick = () => this.verBiometriaPorAspirante(hoja._id);
                }
            }
        });
    }

    agendar(hoja: HojaVida) {
        this.agendamientoForm.reset();

        Swal.fire({
            title: `Agendar Cita - ${hoja.NOMBRE} ${hoja.PRIMER_APELLIDO}`,
            html: `
                <div class="container-fluid">
                    <form id="agendamientoForm">
                        <div class="mb-3">
                            <label for="fechaHora" class="form-label text-start d-block">
                                <i class="fas fa-calendar-alt me-2"></i>Fecha y Hora de Agendamiento
                            </label>
                            <input type="datetime-local" id="fechaHora" class="form-control" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="examenes" class="form-label text-start d-block">
                                <i class="fas fa-stethoscope me-2"></i>Exámenes a Realizar
                            </label>
                            <textarea id="examenes" class="form-control" rows="3" 
                                placeholder="Describa los exámenes médicos a realizar..." 
                                maxlength="500" required></textarea>
                            <small class="text-muted">Máximo 500 caracteres</small>
                        </div>
                        
                        <div class="mb-3">
                            <label for="recomendaciones" class="form-label text-start d-block">
                                <i class="fas fa-clipboard-list me-2"></i>Recomendaciones
                            </label>
                            <textarea id="recomendaciones" class="form-control" rows="3" 
                                placeholder="Escriba las recomendaciones para el paciente..." 
                                maxlength="500" required></textarea>
                            <small class="text-muted">Máximo 500 caracteres</small>
                        </div>
                    </form>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'Agendar Cita',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            preConfirm: () => {
                const fechaHora = (document.getElementById('fechaHora') as HTMLInputElement).value;
                const examenes = (document.getElementById('examenes') as HTMLTextAreaElement).value;
                const recomendaciones = (document.getElementById('recomendaciones') as HTMLTextAreaElement).value;

                if (!fechaHora || !examenes.trim() || !recomendaciones.trim()) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }

                if (examenes.length > 500 || recomendaciones.length > 500) {
                    Swal.showValidationMessage('Los campos no pueden exceder 500 caracteres');
                    return false;
                }

                return {
                    fechaHora,
                    examenes: examenes.trim(),
                    recomendaciones: recomendaciones.trim(),
                    hojaVidaId: hoja._id,
                    paciente: `${hoja.NOMBRE} ${hoja.PRIMER_APELLIDO}`,
                    documento: hoja.DOCUMENTO
                };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.procesarAgendamiento(result.value);
            }
        });
    }

    private procesarAgendamiento(datosAgendamiento: any) {
        this.isLoadingAgendamiento = true;

        // Obtener información del usuario autenticado
        let userInfo = this.authService.getUserInfo();

        // TEMPORAL: Si no existen los IDs, agregarlos al localStorage
        if (userInfo && (!userInfo.id || !userInfo.ips_id)) {
            userInfo.id = userInfo.id || 'USER_TEMP_ID_123';
            userInfo.ips_id = userInfo.ips_id || 'IPS_TEMP_ID_456';
            localStorage.setItem('user', JSON.stringify(userInfo));
        }

        // Verificar si tenemos los IDs necesarios
        if (!userInfo?.id || !userInfo?.ips_id) {
            console.warn('⚠️ ADVERTENCIA: Faltan ID de usuario o IPS. Es necesario hacer logout y login nuevamente.');

            Swal.fire({
                title: 'Información Incompleta',
                text: 'Para completar el agendamiento, es necesario cerrar sesión y volver a iniciar sesión.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Cerrar Sesión',
                cancelButtonText: 'Continuar Sin IDs',
                confirmButtonColor: '#dc3545'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.authService.logout();
                    return;
                }
            });
        }

        // Construir el payload para actualizar el documento de hoja de vida
        const updatePayload = {
            hojaVidaId: datosAgendamiento.hojaVidaId,
            fecha_hora: datosAgendamiento.fechaHora,
            examenes: datosAgendamiento.examenes,
            recomendaciones: datosAgendamiento.recomendaciones,
            usuario_id: userInfo?.id || 'USUARIO_NO_IDENTIFICADO',
            ips_id: userInfo?.ips_id || 'IPS_NO_IDENTIFICADA'
        };

        // Llamar al servicio para actualizar la hoja de vida
        this.ipsGestionService.agendarCita(updatePayload).subscribe({
            next: (response) => {
                this.isLoadingAgendamiento = false;

                Swal.fire({
                    title: '¡Cita Agendada Exitosamente!',
                    html: `
                        <div class="text-start">
                            <p><strong>Paciente:</strong> ${datosAgendamiento.paciente}</p>
                            <p><strong>Documento:</strong> ${datosAgendamiento.documento}</p>
                            <p><strong>Fecha y Hora:</strong> ${new Date(datosAgendamiento.fechaHora).toLocaleString('es-CO')}</p>
                            <p><strong>Exámenes:</strong> ${datosAgendamiento.examenes}</p>
                            <p><strong>Recomendaciones:</strong> ${datosAgendamiento.recomendaciones}</p>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#28a745'
                });

                // Actualizar la lista de hojas de vida para reflejar los cambios
                this.consultarHojasVida();
            },
            error: (error) => {
                this.isLoadingAgendamiento = false;
                console.error('Error al agendar cita:', error);

                Swal.fire({
                    title: 'Error al Agendar',
                    text: 'No se pudo agendar la cita. Por favor, intente nuevamente.',
                    icon: 'error',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    exportarExcel() {
        if (this.hojasVidaFiltradas.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay hojas de vida para exportar',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const datosExport = this.hojasVidaFiltradas.map(hoja => ({
            'Documento': hoja.DOCUMENTO,
            'Nombre Completo': `${hoja.NOMBRE} ${hoja.PRIMER_APELLIDO} ${hoja.SEGUNDO_APELLIDO}`.trim(),
            'Edad': hoja.EDAD,
            'Género': hoja.GENERO,
            'Correo': hoja.CORREO,
            'Teléfono': hoja.TELEFONO,
            'Celular': hoja.CELULAR,
            'Ciudad': hoja.CIUDAD,
            'Departamento': hoja.DEPARTAMENTO,
            'Estado': hoja.ESTADO,
            'Regional': hoja.REGIONAL,
            'Código Inscripción': hoja.CODIGO_INSCRIPCION,
            'Programa Académico': hoja.CODIPROGACAD,
            'Año Académico': hoja.ANNOPERIACAD,
            'Colegio': hoja.COLEGIO,
            'Estrato': hoja.ESTRATO,
            'Tipo Medio': hoja.TIPO_MEDIO
        }));

        const ws = XLSX.utils.json_to_sheet(datosExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Hojas de Vida');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `hojas_vida_${fecha}.xlsx`);

        Swal.fire({
            title: '¡Exportación Exitosa!',
            text: `Se han exportado ${datosExport.length} registros`,
            icon: 'success',
            confirmButtonText: 'Entendido'
        });
    }

    // ==================== MÉTODOS PARA CASOS TOMADOS ====================

    consultarCasosTomados() {
        this.isLoadingCasos = true;

        // Obtener el ips_id del usuario logueado
        const userInfo = this.authService.getUserInfo();
        const ipsId = userInfo?.ips_id;

        if (!ipsId) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo obtener el ID de la IPS. Por favor, inicie sesión nuevamente.',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
            this.isLoadingCasos = false;
            return;
        }

        this.ipsGestionService.consultarCasosTomados(ipsId).subscribe({
            next: (response) => {
                this.isLoadingCasos = false;

                if (response?.error === 1) {
                    Swal.fire({
                        title: 'Error',
                        text: response.response?.mensaje || 'Error al consultar casos tomados',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                } else {
                    this.casosTomados = response.response?.data || [];
                    this.totalItemsCasos = this.casosTomados.length;
                    this.filtrarCasosTomados();
                }
            },
            error: (error) => {
                this.isLoadingCasos = false;
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo conectar con el servidor. Verifique su conexión.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }

    filtrarCasosTomados() {
        // Validar que casosTomados sea un array válido
        if (!Array.isArray(this.casosTomados)) {
            this.casosTomados = [];
            this.casosTomadosFiltrados = [];
            return;
        }

        if (!this.searchTermCasos.trim()) {
            this.casosTomadosFiltrados = [...this.casosTomados];
        } else {
            const termino = this.searchTermCasos.toLowerCase();
            this.casosTomadosFiltrados = this.casosTomados.filter(caso =>
                caso.NOMBRE?.toLowerCase().includes(termino) ||
                caso.PRIMER_APELLIDO?.toLowerCase().includes(termino) ||
                caso.SEGUNDO_APELLIDO?.toLowerCase().includes(termino) ||
                caso.DOCUMENTO?.toLowerCase().includes(termino) ||
                caso.CORREO?.toLowerCase().includes(termino) ||
                caso.CIUDAD?.toLowerCase().includes(termino) ||
                caso.EXAMENES?.toLowerCase().includes(termino) ||
                caso.NOMBREIPS?.toLowerCase().includes(termino)
            );
        }
        this.currentPageCasos = 1;
    }

    onSearchChangeCasos() {
        this.filtrarCasosTomados();
    }

    get paginatedCasosTomados() {
        const start = (this.currentPageCasos - 1) * this.itemsPerPageCasos;
        return this.casosTomadosFiltrados.slice(start, start + this.itemsPerPageCasos);
    }

    get totalPagesCasos() {
        return Math.ceil(this.casosTomadosFiltrados.length / this.itemsPerPageCasos);
    }

    changePageCasos(page: number) {
        if (page >= 1 && page <= this.totalPagesCasos) {
            this.currentPageCasos = page;
        }
    }

    cargarPDF(caso: HojaVida) {
        Swal.fire({
            title: 'Cargar PDF',
            html: `
                <div class="text-start mb-3">
                    <p><strong>Paciente:</strong> ${caso.NOMBRE} ${caso.PRIMER_APELLIDO} ${caso.SEGUNDO_APELLIDO}</p>
                    <p><strong>Documento:</strong> ${caso.DOCUMENTO}</p>
                </div>
                <div class="mb-3">
                    <label for="pdfFile" class="form-label">Seleccionar archivo PDF:</label>
                    <input type="file" id="pdfFile" class="form-control" accept=".pdf">
                </div>
                <div id="pdfPreview" class="mt-3" style="display: none;">
                    <h6>Vista previa:</h6>
                    <embed id="pdfEmbed" type="application/pdf" width="100%" height="300px">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar PDF',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            width: '600px',
            didOpen: () => {
                const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
                const pdfPreview = document.getElementById('pdfPreview') as HTMLDivElement;
                const pdfEmbed = document.getElementById('pdfEmbed') as HTMLEmbedElement;

                fileInput?.addEventListener('change', (event) => {
                    const file = (event.target as HTMLInputElement).files?.[0];
                    if (file && file.type === 'application/pdf') {
                        const fileURL = URL.createObjectURL(file);
                        pdfEmbed.src = fileURL;
                        pdfPreview.style.display = 'block';
                    } else if (file) {
                        Swal.showValidationMessage('Por favor seleccione un archivo PDF válido');
                        pdfPreview.style.display = 'none';
                    }
                });
            },
            preConfirm: () => {
                const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
                const file = fileInput?.files?.[0];

                if (!file) {
                    Swal.showValidationMessage('Por favor seleccione un archivo PDF');
                    return false;
                }

                if (file.type !== 'application/pdf') {
                    Swal.showValidationMessage('El archivo debe ser un PDF');
                    return false;
                }

                if (file.size > 40 * 1024 * 1024) { // 40MB
                    Swal.showValidationMessage('El archivo no debe superar los 40MB');
                    return false;
                }

                return file;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.procesarCargaPDF(caso._id, result.value);
            }
        });
    }

    cargarBiometria(caso: HojaVida) {
        Swal.fire({
            title: 'Cargar Datos Biométricos',
            html: `
                <div class="text-start mb-3">
                    <p><strong>Paciente:</strong> ${caso.NOMBRE} ${caso.PRIMER_APELLIDO} ${caso.SEGUNDO_APELLIDO}</p>
                    <p><strong>Documento:</strong> ${caso.DOCUMENTO}</p>
                </div>
                <div class="mb-3">
                    <label for="bioFile" class="form-label">Seleccionar archivo PDF de datos biométricos:</label>
                    <input type="file" id="bioFile" class="form-control" accept=".pdf">
                </div>
                <div id="bioPreview" class="mt-3" style="display: none;">
                    <h6>Vista previa:</h6>
                    <embed id="bioEmbed" type="application/pdf" width="100%" height="300px">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar Biometría',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            width: '600px',
            didOpen: () => {
                const fileInput = document.getElementById('bioFile') as HTMLInputElement;
                const preview = document.getElementById('bioPreview') as HTMLDivElement;
                const embed = document.getElementById('bioEmbed') as HTMLEmbedElement;

                fileInput?.addEventListener('change', (event) => {
                    const file = (event.target as HTMLInputElement).files?.[0];
                    if (file && file.type === 'application/pdf') {
                        const fileURL = URL.createObjectURL(file);
                        embed.src = fileURL;
                        preview.style.display = 'block';
                    } else if (file) {
                        Swal.showValidationMessage('Por favor seleccione un archivo PDF válido');
                        preview.style.display = 'none';
                    }
                });
            },
            preConfirm: () => {
                const fileInput = document.getElementById('bioFile') as HTMLInputElement;
                const file = fileInput?.files?.[0];

                if (!file) {
                    Swal.showValidationMessage('Por favor seleccione un archivo PDF');
                    return false;
                }

                if (file.type !== 'application/pdf') {
                    Swal.showValidationMessage('El archivo debe ser un PDF');
                    return false;
                }

                if (file.size > 40 * 1024 * 1024) {
                    Swal.showValidationMessage('El archivo no debe superar los 40MB');
                    return false;
                }

                return file;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.procesarCargaBiometria(caso._id, result.value);
            }
        });
    }

    private procesarCargaBiometria(idAspirante: string, pdfFile: File) {
        const userInfo = this.authService.getUserInfo();
        const idUsuario = userInfo?.id;

        if (!idUsuario) {
            Swal.fire({
                title: 'Sesión requerida',
                text: 'No se pudo obtener el usuario logueado. Inicie sesión nuevamente.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        this.ipsGestionService.subirBiometria(idAspirante, idUsuario, pdfFile).subscribe({
            next: (response) => {
                if (response?.error === 0) {
                    Swal.fire({
                        title: '¡Biometría cargada!',
                        text: response?.response?.mensaje || 'PDF de datos biométricos subido correctamente',
                        icon: 'success',
                        confirmButtonText: 'Entendido'
                    });
                    this.consultarCasosTomados();
                } else {
                    Swal.fire({
                        title: 'Error al cargar biometría',
                        text: response?.response?.mensaje || response?.mensaje || 'Error desconocido del servidor',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                }
            },
            error: (error) => {
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo cargar el PDF de biometría. Verifique su conexión.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }

    onPdfFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            console.log('📄 Archivo seleccionado:');
            console.log('- Nombre:', file.name);
            console.log('- Tipo:', file.type);
            console.log('- Tamaño:', file.size, 'bytes');
            console.log('- Tamaño en MB:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
            console.log('- Límite:', (10 * 1024 * 1024), 'bytes');
            console.log('- ¿Supera límite?:', file.size > 10 * 1024 * 1024);

            if (file.type !== 'application/pdf') {
                console.log('❌ Error: Tipo de archivo inválido');
                Swal.fire({
                    title: 'Archivo Inválido',
                    text: 'Por favor seleccione un archivo PDF válido',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
                event.target.value = '';
                return;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB
                Swal.fire({
                    title: 'Archivo Muy Grande',
                    text: 'El archivo no debe superar los 10MB',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
                event.target.value = '';
                return;
            }

            console.log('✅ Archivo válido, guardando...');
            this.selectedPdfFile = file;

            // Crear URL para vista previa
            const reader = new FileReader();
            reader.onload = (e) => {
                this.pdfPreviewUrl = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    guardarPDF() {
        console.log('🚀 Iniciando guardarPDF...');
        console.log('- Caso seleccionado:', this.selectedCaso?._id);
        console.log('- Archivo seleccionado:', this.selectedPdfFile?.name);
        console.log('- Tamaño del archivo:', this.selectedPdfFile?.size, 'bytes');

        if (!this.selectedCaso || !this.selectedPdfFile) {
            console.log('❌ Error: Faltan datos');
            Swal.fire({
                title: 'Error',
                text: 'No hay caso o archivo seleccionado',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        console.log('✅ Datos válidos, procesando carga...');
        this.procesarCargaPDF(this.selectedCaso._id, this.selectedPdfFile);
    }

    private procesarCargaPDF(hojaVidaId: string, pdfFile: File) {
        this.ipsGestionService.cargarPDF(hojaVidaId, pdfFile).subscribe({
            next: (response) => {
                this.isLoadingPdf = false;

                if (response?.error === 0) {
                    // Cerrar modal
                    try {
                        const modalElement = document.getElementById('pdfModal');
                        if (modalElement && (window as any).bootstrap && (window as any).bootstrap.Modal) {
                            const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
                            if (modal) {
                                modal.hide();
                            }
                        }
                    } catch (error) {
                        console.log('⚠️ No se pudo cerrar el modal automáticamente:', error);
                    }

                    Swal.fire({
                        title: '¡PDF Cargado Exitosamente!',
                        html: `
                            <div class="text-start">
                                <p><strong>Mensaje:</strong> ${response.response?.mensaje || 'PDF almacenado correctamente'}</p>
                                <p><strong>ID:</strong> ${response.response?.id || hojaVidaId}</p>
                                <p><strong>URL:</strong> ${response.response?.url || 'Archivo guardado'}</p>
                            </div>
                        `,
                        icon: 'success',
                        confirmButtonText: 'Entendido'
                    });

                    // Limpiar datos del modal
                    this.selectedCaso = null;
                    this.selectedPdfFile = null;
                    this.pdfPreviewUrl = null;

                    // Limpiar el input de archivo
                    const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
                    if (fileInput) {
                        fileInput.value = '';
                    }

                    // Actualizar la lista de casos
                    this.consultarCasosTomados();
                } else {
                    Swal.fire({
                        title: 'Error al Cargar PDF',
                        text: response.response?.mensaje || response.mensaje || 'Error desconocido del servidor',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                }
            },
            error: (error) => {
                this.isLoadingPdf = false;
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo cargar el PDF. Verifique su conexión.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }

    exportarExcelCasos() {
        if (this.casosTomadosFiltrados.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay casos tomados para exportar',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const datosExport = this.casosTomadosFiltrados.map(caso => ({
            'Documento': caso.DOCUMENTO,
            'Nombre Completo': `${caso.NOMBRE} ${caso.PRIMER_APELLIDO} ${caso.SEGUNDO_APELLIDO}`,
            'Edad': caso.EDAD,
            'Género': caso.GENERO,
            'Exámenes': caso.EXAMENES || 'N/A',
            'Fecha/Hora Cita': this.formatearFechaHora(caso.FECHA_HORA),
            'IPS': caso.NOMBREIPS || 'N/A',
            'Recomendaciones': caso.RECOMENDACIONES || 'N/A',
            'Correo': caso.CORREO,
            'Teléfono': caso.TELEFONO,
            'Ciudad': caso.CIUDAD,
            'Estado': caso.ESTADO
        }));

        const ws = XLSX.utils.json_to_sheet(datosExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Casos Tomados');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `casos_tomados_${fecha}.xlsx`);

        Swal.fire({
            title: '¡Exportación Exitosa!',
            text: `Se han exportado ${datosExport.length} registros`,
            icon: 'success',
            confirmButtonText: 'Entendido'
        });
    }

    getEstadoBadgeClass(estado: string): string {
        switch (estado?.toLowerCase()) {
            case 'activo':
                return 'bg-warning';
            case 'en gestion':
                return 'bg-primary';
            case 'gestionado':
                return 'bg-success';
            case 'inactivo':
                return 'bg-danger';
            case 'en espera':
                return 'bg-secondary';
            default:
                return 'bg-secondary';
        }
    }

    formatearFechaHora(fechaHora: string | undefined): string {
        if (!fechaHora) return 'N/A';

        try {
            const fecha = new Date(fechaHora);
            return fecha.toLocaleString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return fechaHora;
        }
    }

    verPDF(pdfUrl: string): void {
        // Extraer el nombre del archivo de la URL
        const filename = pdfUrl.split('/').pop();

        if (!filename) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo obtener el nombre del archivo PDF',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        // Mostrar loading
        Swal.fire({
            title: 'Cargando PDF...',
            text: 'Por favor espere mientras se carga el documento',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Llamar al servicio para obtener el PDF
        this.ipsGestionService.obtenerPDF(filename).subscribe({
            next: (pdfBlob: Blob) => {
                // Crear URL del blob
                const pdfBlobUrl = URL.createObjectURL(pdfBlob);

                // Cerrar el loading y mostrar el PDF en modal dedicado
                Swal.close();

                // Crear modal dedicado para el PDF
                const pdfHtml = `
                    <div style="width: 100%; height: 80vh; display: flex; flex-direction: column;">
                        <div style="margin-bottom: 10px; text-align: center;">
                            <strong style="color: #333;">${filename}</strong>
                        </div>
                        <iframe 
                            src="${pdfBlobUrl}" 
                            style="width: 100%; height: 100%; border: none; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
                            type="application/pdf">
                            <p>Su navegador no soporta la visualización de PDFs. 
                               <a href="${pdfBlobUrl}" target="_blank">Haga clic aquí para descargar el PDF</a>
                            </p>
                        </iframe>
                    </div>
                `;

                Swal.fire({
                    title: 'Visualizador de PDF',
                    html: pdfHtml,
                    width: '95%',
                    heightAuto: false,
                    showCloseButton: true,
                    showConfirmButton: true,
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6c757d',
                    customClass: {
                        popup: 'swal-pdf-viewer',
                        htmlContainer: 'swal-pdf-container'
                    },
                    willClose: () => {
                        // Limpiar la URL del blob cuando se cierre el modal
                        URL.revokeObjectURL(pdfBlobUrl);
                    }
                });
            },
            error: (error) => {
                console.error('Error al obtener PDF:', error);
                Swal.fire({
                    title: 'Error al cargar PDF',
                    text: 'No se pudo cargar el documento PDF. Verifique que el archivo existe.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }

    verBiometriaPorAspirante(aspiranteId: string): void {
        if (!aspiranteId) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo identificar el aspirante para descargar la biometría',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        Swal.fire({
            title: 'Cargando Biometría...',
            text: 'Por favor espere mientras se carga el documento',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this.ipsGestionService.obtenerBiometriaPorAspirante(aspiranteId).subscribe({
            next: (pdfBlob: Blob) => {
                const pdfBlobUrl = URL.createObjectURL(pdfBlob);
                Swal.close();

                const html = `
                    <div style="width: 100%; height: 80vh;">
                        <iframe src="${pdfBlobUrl}" style="width: 100%; height: 100%; border: none;" type="application/pdf"></iframe>
                    </div>
                `;
                Swal.fire({
                    title: 'Datos Biométricos (PDF)',
                    html,
                    width: '95%',
                    heightAuto: false,
                    showCloseButton: true,
                    showConfirmButton: true,
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6c757d',
                    willClose: () => {
                        try { URL.revokeObjectURL(pdfBlobUrl); } catch {}
                    }
                });
            },
            error: (error) => {
                Swal.close();
                Swal.fire({
                    title: 'Error al cargar Biometría',
                    text: 'No se pudo cargar el PDF de biometría. Verifique su sesión y conexión.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }
}
