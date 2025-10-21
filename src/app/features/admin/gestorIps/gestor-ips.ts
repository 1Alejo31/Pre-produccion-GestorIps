import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { GestorIpsService } from '../../../core/services/gestor-ips.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

interface IPS {
    _id: string;
    NOMBRE_IPS: string;
    NIT: string;
    DIRECCION: string;
    TELEFONO: string;
    CORREO: string;
    REPRESENTANTE: string;
    CIUDAD: string;
    DEPARTAMENTO: string;
    REGIONAL: string;
    ESTADO: string;
    COMPLEMENTARIA_1: {
        tipo_atencion: string;
        especialidades: string[];
    };
    COMPLEMENTARIA_2: {
        horario_atencion: string;
        nivel_complejidad: string;
    };
    FECHA_REGISTRO: string;
    createdAt: string;
    updatedAt: string;
}

@Component({
    selector: 'app-gestor-ips',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './gestor-ips.html',
    styleUrls: ['./gestor-ips.css']
})
export class GestorIps implements OnInit {
    ngOnInit(): void {
        // Initialization logic can be added here if needed
    }
    activeTab = 'registro';

    // Propiedades para consulta
    ipsExistentes: IPS[] = [];
    ipsFiltradas: IPS[] = [];
    isLoadingConsulta = false;
    searchTerm = '';
    currentPage = 1;
    itemsPerPage = 10;
    totalItems = 0;

    // Propiedades para formulario de registro
    form!: FormGroup;
    submitted = false;
    isLoading = false;

    // Opciones para selects
    regionales = ['Regional Norte', 'Regional Sur', 'Regional Oriente', 'Regional Occidente', 'Regional Centro', 'Regional Caribe', 'Regional Pacífico', 'Regional Amazonía'];
    estados = ['ACTIVA', 'SUSPENDIDA', 'CANCELADA'];
    tiposAtencion = ['Ambulatoria', 'Hospitalaria', 'Urgencias', 'Domiciliaria', 'Cirugía', 'Consulta Externa', 'Hospitalización'];
    especialidades = [
        'Medicina General',
        'Pediatría',
        'Ginecología',
        'Cardiología',
        'Neurología',
        'Ortopedia',
        'Dermatología',
        'Psiquiatría',
        'Oftalmología',
        'Otorrinolaringología'
    ];
    nivelesComplejidad = ['I', 'II', 'III', 'IV'];
    horariosAtencion = ['24 Horas', '6:00 AM - 6:00 PM', '7:00 AM - 7:00 PM', '8:00 AM - 5:00 PM', '8:00 AM - 6:00 PM', 'Lunes a Viernes 8:00 AM - 5:00 PM', 'Lunes a Sábado 7:00 AM - 6:00 PM'];

    Math = Math;

    constructor(
        private gestorIpsService: GestorIpsService,
        private fb: FormBuilder
    ) {
        this.initializeForm();
    }

    private initializeForm(): void {
        this.form = this.fb.group({
            NOMBRE_IPS: ['', [Validators.required, Validators.maxLength(100)]],
            NIT: ['', [Validators.required, Validators.pattern(/^\d{9}-\d{1}$/)]],
            DIRECCION: ['', [Validators.required, Validators.maxLength(200)]],
            TELEFONO: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
            CORREO: ['', [Validators.required, Validators.email]],
            REPRESENTANTE: ['', [Validators.required, Validators.maxLength(100)]],
            CIUDAD: ['', [Validators.required, Validators.maxLength(50)]],
            DEPARTAMENTO: ['', [Validators.required]],
            REGIONAL: ['', [Validators.required]],
            ESTADO: ['ACTIVA', [Validators.required]],
            tipo_atencion: ['', [Validators.required]],
            especialidades: this.fb.array([]),
            horario_atencion: ['', [Validators.required]],
            nivel_complejidad: ['', [Validators.required]]
        });
    }

    setActiveTab(tab: string) {
        this.activeTab = tab;
        if (tab === 'consulta') {
            this.consultarIps(false); // No mostrar popup al cambiar de tab
        }
    }



    // Getters para el formulario
    get especialidadesArray(): FormArray {
        return this.form.get('especialidades') as FormArray;
    }

    // Métodos para el formulario de registro
    onEspecialidadChange(especialidad: string, event: any): void {
        const especialidadesArray = this.especialidadesArray;

        if (event.target.checked) {
            especialidadesArray.push(this.fb.control(especialidad));
        } else {
            const index = especialidadesArray.controls.findIndex(x => x.value === especialidad);
            if (index >= 0) {
                especialidadesArray.removeAt(index);
            }
        }
    }

    isEspecialidadSelected(especialidad: string): boolean {
        return this.especialidadesArray.value.includes(especialidad);
    }

    onSubmit(): void {
        this.submitted = true;

        if (this.form.invalid) {
            this.markFormGroupTouched();
            Swal.fire({
                title: 'Formulario Incompleto',
                text: 'Por favor, complete todos los campos requeridos.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        this.isLoading = true;

        // Construir el objeto JSON según la estructura requerida
        const ipsData = {
            NOMBRE_IPS: this.form.get('NOMBRE_IPS')?.value,
            NIT: this.form.get('NIT')?.value,
            DIRECCION: this.form.get('DIRECCION')?.value,
            TELEFONO: this.form.get('TELEFONO')?.value,
            CORREO: this.form.get('CORREO')?.value,
            REPRESENTANTE: this.form.get('REPRESENTANTE')?.value,
            CIUDAD: this.form.get('CIUDAD')?.value,
            DEPARTAMENTO: this.form.get('DEPARTAMENTO')?.value,
            REGIONAL: this.form.get('REGIONAL')?.value,
            ESTADO: this.form.get('ESTADO')?.value,
            COMPLEMENTARIA_1: {
                tipo_atencion: this.form.get('tipo_atencion')?.value,
                especialidades: this.especialidadesArray.value
            },
            COMPLEMENTARIA_2: {
                horario_atencion: this.form.get('horario_atencion')?.value,
                nivel_complejidad: this.form.get('nivel_complejidad')?.value
            }
        };

        this.gestorIpsService.registrarIps(ipsData).subscribe({
            next: (response) => {
                this.isLoading = false;

                if (response.error === 0) {
                    Swal.fire({
                        title: '¡Éxito!',
                        text: response.response?.mensaje || 'IPS registrada exitosamente',
                        icon: 'success',
                        confirmButtonText: 'Continuar'
                    }).then(() => {
                        this.resetForm();
                        this.consultarIps(true);
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: response.response?.mensaje || 'Error al registrar la IPS',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                }
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Error al registrar IPS:', error);

                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }

    resetForm(): void {
        this.form.reset();
        this.submitted = false;
        this.especialidadesArray.clear();

        // Restablecer valores por defecto
        this.form.patchValue({
            ESTADO: 'ACTIVA'
        });
    }

    private markFormGroupTouched(): void {
        Object.keys(this.form.controls).forEach(key => {
            const control = this.form.get(key);
            control?.markAsTouched();
        });
    }

    // Métodos de validación para mostrar errores
    isFieldInvalid(fieldName: string): boolean {
        const field = this.form.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
    }

    getFieldError(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (field?.errors) {
            if (field.errors['required']) return 'Este campo es requerido';
            if (field.errors['email']) return 'Ingrese un email válido';
            if (field.errors['pattern']) {
                if (fieldName === 'NIT') return 'Formato: 123456789-0';
                if (fieldName === 'TELEFONO') return 'Ingrese un teléfono válido';
            }
            if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
        }
        return '';
    }

    consultarIps(showSuccessMessage: boolean = true) {
        this.isLoadingConsulta = true;
        this.gestorIpsService.consultarIps().subscribe({
            next: (response) => {
                this.isLoadingConsulta = false;

                if (response.error === 0) {
                    this.ipsExistentes = response.response.ips || [];
                    this.totalItems = response.response.total || 0;
                    this.filtrarIps();

                    // Solo mostrar popup de éxito si showSuccessMessage es true
                    if (showSuccessMessage) {
                        Swal.fire({
                            title: '¡Éxito!',
                            text: response.response.mensaje || 'IPS consultadas exitosamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                } else {
                    Swal.fire({
                        title: 'Información',
                        text: response.response?.mensaje || 'No se encontraron IPS registradas',
                        icon: 'info',
                        confirmButtonText: 'Entendido'
                    });
                    this.ipsExistentes = [];
                    this.ipsFiltradas = [];
                    this.totalItems = 0;
                }
            },
            error: (error) => {
                this.isLoadingConsulta = false;
                console.error('Error al consultar IPS:', error);

                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        });
    }

    filtrarIps() {
        if (!this.searchTerm.trim()) {
            this.ipsFiltradas = [...this.ipsExistentes];
        } else {
            const termino = this.searchTerm.toLowerCase();
            this.ipsFiltradas = this.ipsExistentes.filter(ips =>
                ips.NOMBRE_IPS.toLowerCase().includes(termino) ||
                ips.NIT.toLowerCase().includes(termino) ||
                ips.CORREO.toLowerCase().includes(termino) ||
                ips.REPRESENTANTE.toLowerCase().includes(termino) ||
                ips.CIUDAD.toLowerCase().includes(termino) ||
                ips.DEPARTAMENTO.toLowerCase().includes(termino) ||
                ips.REGIONAL.toLowerCase().includes(termino) ||
                ips.ESTADO.toLowerCase().includes(termino)
            );
        }
        this.currentPage = 1;
    }

    onSearchChange() {
        this.filtrarIps();
    }

    get paginatedIps() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.ipsFiltradas.slice(startIndex, endIndex);
    }

    get totalPages() {
        return Math.ceil(this.ipsFiltradas.length / this.itemsPerPage);
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    verDetalle(ips: IPS) {
        const especialidades = ips.COMPLEMENTARIA_1.especialidades.join(', ');

        let html = '<div class="text-start" style="font-family: Arial, sans-serif;">';

        // Header con estado
        html += `<div class="d-flex align-items-center mb-3">`;
        html += `<h5 class="mb-0 me-3">Detalle de IPS</h5>`;
        const statusBadge = ips.ESTADO === 'ACTIVA' ?
            '<span class="badge bg-success">✓ Activa</span>' :
            ips.ESTADO === 'SUSPENDIDA' ?
                '<span class="badge bg-warning">⏸️ Suspendida</span>' :
                '<span class="badge bg-danger">✗ Cancelada</span>';
        html += statusBadge;
        html += `</div>`;

        // Información Básica
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-primary text-white"><strong>🏥 Información Básica</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const basicFields = [
            { key: 'NOMBRE_IPS', label: '🏥 Nombre de la IPS', value: ips.NOMBRE_IPS },
            { key: 'NIT', label: '🆔 NIT', value: ips.NIT },
            { key: 'REPRESENTANTE', label: '👤 Representante Legal', value: ips.REPRESENTANTE },
            { key: 'REGIONAL', label: '🏢 Regional', value: ips.REGIONAL }
        ];

        basicFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="text-dark" style="font-size: 1.1em;">${field.value || 'N/A'}</span>`;
            html += `</div>`;
        });

        html += '</div></div></div>';

        // Información de Contacto
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-info text-white"><strong>📞 Información de Contacto</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const contactFields = [
            { key: 'DIRECCION', label: '🏠 Dirección', value: ips.DIRECCION },
            { key: 'TELEFONO', label: '☎️ Teléfono', value: ips.TELEFONO },
            { key: 'CORREO', label: '📧 Correo Electrónico', value: ips.CORREO },
            { key: 'CIUDAD', label: '🏙️ Ciudad', value: ips.CIUDAD },
            { key: 'DEPARTAMENTO', label: '🗺️ Departamento', value: ips.DEPARTAMENTO }
        ];

        contactFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="text-dark" style="font-size: 1.1em;">${field.value || 'N/A'}</span>`;
            html += `</div>`;
        });

        html += '</div></div></div>';

        // Información de Servicios
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-success text-white"><strong>🩺 Información de Servicios</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const serviceFields = [
            { key: 'tipo_atencion', label: '🏥 Tipo de Atención', value: ips.COMPLEMENTARIA_1.tipo_atencion },
            { key: 'nivel_complejidad', label: '📊 Nivel de Complejidad', value: ips.COMPLEMENTARIA_2.nivel_complejidad },
            { key: 'horario_atencion', label: '🕐 Horario de Atención', value: ips.COMPLEMENTARIA_2.horario_atencion }
        ];

        serviceFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="text-dark" style="font-size: 1.1em;">${field.value || 'N/A'}</span>`;
            html += `</div>`;
        });

        // Especialidades en toda la fila
        html += `<div class="col-12 mb-2 p-2" style="border-radius: 5px;">`;
        html += `<strong class="text-muted">🩺 Especialidades:</strong><br>`;
        html += `<span class="text-dark" style="font-size: 1.1em;">${especialidades || 'N/A'}</span>`;
        html += `</div>`;

        html += '</div></div></div>';

        // Información del Sistema
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-secondary text-white"><strong>🔑 Información del Sistema</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';

        const systemFields = [
            { key: 'ESTADO', label: '📊 Estado', value: ips.ESTADO, isBadge: true },
            { key: 'FECHA_REGISTRO', label: '📅 Fecha de Registro', value: new Date(ips.FECHA_REGISTRO).toLocaleDateString('es-CO') },
            { key: 'createdAt', label: '📅 Fecha de Creación', value: new Date(ips.createdAt).toLocaleDateString('es-CO') },
            { key: 'updatedAt', label: '📅 Última Actualización', value: new Date(ips.updatedAt).toLocaleDateString('es-CO') }
        ];

        systemFields.forEach(field => {
            html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;

            if (field.isBadge) {
                const badgeClass = field.value === 'ACTIVA' ? 'bg-success' : field.value === 'SUSPENDIDA' ? 'bg-warning' : 'bg-danger';
                html += `<span class="badge ${badgeClass}" style="font-size: 1em;">${field.value}</span>`;
            } else {
                html += `<span class="text-dark" style="font-size: 1.1em; font-family: monospace;">${field.value || 'N/A'}</span>`;
            }
            html += `</div>`;
        });

        html += '</div></div></div>';
        html += '</div>';

        Swal.fire({
            title: `${ips.NOMBRE_IPS}`,
            html: html,
            icon: 'info',
            width: '900px',
            showCloseButton: true,
            confirmButtonText: 'Cerrar',
            customClass: {
                popup: 'swal-wide'
            }
        });
    }

    exportarExcel() {
        if (this.ipsFiltradas.length === 0) {
            Swal.fire({
                title: 'Sin datos',
                text: 'No hay datos para exportar',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const datosExportar = this.ipsFiltradas.map(ips => ({
            'Nombre IPS': ips.NOMBRE_IPS,
            'NIT': ips.NIT,
            'Dirección': ips.DIRECCION,
            'Teléfono': ips.TELEFONO,
            'Correo': ips.CORREO,
            'Representante': ips.REPRESENTANTE,
            'Ciudad': ips.CIUDAD,
            'Departamento': ips.DEPARTAMENTO,
            'Regional': ips.REGIONAL,
            'Estado': ips.ESTADO,
            'Tipo de Atención': ips.COMPLEMENTARIA_1.tipo_atencion,
            'Especialidades': ips.COMPLEMENTARIA_1.especialidades.join(', '),
            'Horario de Atención': ips.COMPLEMENTARIA_2.horario_atencion,
            'Nivel de Complejidad': ips.COMPLEMENTARIA_2.nivel_complejidad,
            'Fecha de Registro': new Date(ips.FECHA_REGISTRO).toLocaleDateString('es-CO')
        }));

        const ws = XLSX.utils.json_to_sheet(datosExportar);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'IPS');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `IPS_${fecha}.xlsx`);

        Swal.fire({
            title: '¡Éxito!',
            text: 'Archivo Excel exportado correctamente',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    }

    getEstadoBadgeClass(estado: string): string {
        switch (estado) {
            case 'ACTIVA':
                return 'bg-success';
            case 'SUSPENDIDA':
                return 'bg-warning text-dark';
            case 'INACTIVA':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }
}