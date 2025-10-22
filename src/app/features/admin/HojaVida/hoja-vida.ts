import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { RegisterHojaVidaService } from './hoja.service';
import { AuthService } from '../../../core/auth.service';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

@Component({
    selector: 'app-hoja-vida',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './hoja-vida.html',
    styleUrls: ['./hoja-vida.css']
})
export class HojaVida implements AfterViewInit, OnDestroy {
    form: FormGroup;
    submitted = false;

    activeTab = 'individual';

    selectedFile: File | null = null;
    isProcessing = false;
    uploadResults: any[] = [];
    showResults = false;

    previewData: any[] = [];
    showPreview = false;
    validationErrors: any[] = [];
    
    previewSearchTerm = '';
    previewCurrentPage = 1;
    previewItemsPerPage = 10;
    previewFilteredData: any[] = [];

    successfulRecords: any[] = [];
    duplicateRecords: any[] = [];
    processingMessage = '';
    hasErrors = false;

    Math = Math;

    hojasVidaExistentes: any[] = [];
    hojasVidaFiltradas: any[] = [];
    isLoadingConsulta = false;
    searchTerm = '';
    currentPage = 1;
    itemsPerPage = 10;
    totalItems = 0;

    // Propiedades para gráficas
    @ViewChild('pieChart', { static: false }) pieChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('barChart', { static: false }) barChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('cityChart', { static: false }) cityChartRef!: ElementRef<HTMLCanvasElement>;

    pieChart: Chart | null = null;
    barChart: Chart | null = null;
    cityChart: Chart | null = null;

    estadisticasEstado: any = {};
    estadisticasCiudad: any = {};
    totalHojasVida = 0;
    ultimaActualizacion = new Date();
    isLoadingGraficas = false;
    
    private intervalId: any;

    // Listas para selects
    generos = ['Masculino', 'Femenino', 'Otro'];
    estados = ['Activo', 'Pendiente', 'Rechazado', 'Admitido'];
    estratos = ['1', '2', '3', '4', '5', '6'];
    tiposMedio = ['Radio', 'TV', 'Web', 'Prensa', 'Redes Sociales', 'Referido'];
    gruposMinoritarios = ['Ninguno', 'Étnico', 'Indígena', 'Afrodescendiente', 'ROM', 'Otro'];
    regionales = ['Regional Oriente', 'Regional Caribe', 'Regional Centro', 'Regional Occidente', 'Regional Sur'];

    constructor(
        private fb: FormBuilder,
        private hojaVidaService: RegisterHojaVidaService,
        private authService: AuthService
    ) {
        // Registrar componentes de Chart.js
        Chart.register(...registerables);
        this.form = this.fb.group({

            pkeyHojaVida: ['', [Validators.required]],
            pkeyAspirant: ['', [Validators.required]],
            codiProgAcad: ['', [Validators.required]],
            annoPeriacad: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2030)]],
            numePeriacad: ['1', [Validators.required]],
            codigoInscripcion: ['', [Validators.required]],
            documento: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9\-\.]+$/)]],
            nombre: ['', [Validators.required, Validators.maxLength(100)]],
            primerApellido: ['', [Validators.required, Validators.maxLength(50)]],
            segundoApellido: ['', [Validators.maxLength(50)]],
            edad: ['', [Validators.required, Validators.min(16), Validators.max(35)]],
            genero: ['Masculino', [Validators.required]],
            fechNacimiento: ['', [Validators.required]],
            correo: ['', [Validators.required, Validators.email]],
            telefono: ['', [Validators.pattern(/^\d{7,12}$/)]],
            celular: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
            direccion: ['', [Validators.required, Validators.maxLength(200)]],
            ciudad: ['', [Validators.required]],
            estado: ['Activo', [Validators.required]],
            departamento: ['', [Validators.required]],
            regional: ['', [Validators.required]],
            complementaria1: ['', [Validators.maxLength(200)]],
            complementaria2: ['', [Validators.maxLength(200)]],
            fechaInscripcion: [new Date().toISOString().split('T')[0], [Validators.required]],
            grupMino: ['Ninguno'],
            estrato: ['3', [Validators.required]],
            tipoMedio: ['Web', [Validators.required]],
            colegio: ['', [Validators.required, Validators.maxLength(150)]]
        });
    }

    get f() { return this.form.controls; }

    // Método para cambiar de pestaña
    setActiveTab(tab: string): void {
        this.activeTab = tab;
        
        // Si se selecciona el tab de consulta, cargar las hojas de vida
        if (tab === 'consulta') {
            this.consultarHojasVida();
        } else if (tab === 'graficas') {
            this.iniciarGraficas();
        }
    }

    // Envío individual
    submit(): void {
        this.submitted = true;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const hojaVida = {
            PKEYHOJAVIDA: this.f['pkeyHojaVida'].value,
            PKEYASPIRANT: this.f['pkeyAspirant'].value,
            CODIPROGACAD: this.f['codiProgAcad'].value,
            ANNOPERIACAD: this.f['annoPeriacad'].value,
            NUMEPERIACAD: this.f['numePeriacad'].value,
            CODIGO_INSCRIPCION: this.f['codigoInscripcion'].value,
            DOCUMENTO: this.f['documento'].value,
            NOMBRE: this.f['nombre'].value,
            PRIMER_APELLIDO: this.f['primerApellido'].value,
            SEGUNDO_APELLIDO: this.f['segundoApellido'].value,
            EDAD: this.f['edad'].value,
            GENERO: this.f['genero'].value,
            FECH_NACIMIENTO: this.f['fechNacimiento'].value,
            CORREO: this.f['correo'].value,
            TELEFONO: this.f['telefono'].value,
            CELULAR: this.f['celular'].value,
            DIRECCION: this.f['direccion'].value,
            CIUDAD: this.f['ciudad'].value,
            ESTADO: this.f['estado'].value,
            DEPARTAMENTO: this.f['departamento'].value,
            REGIONAL: this.f['regional'].value,
            COMPLEMENTARIA_1: this.f['complementaria1'].value,
            COMPLEMENTARIA_2: this.f['complementaria2'].value,
            FECHA_INSCRIPCION: this.f['fechaInscripcion'].value,
            GRUP_MINO: this.f['grupMino'].value,
            ESTRATO: this.f['estrato'].value,
            TIPO_MEDIO: this.f['tipoMedio'].value,
            COLEGIO: this.f['colegio'].value
        };

        // Validar antes de enviar
        const validation = this.hojaVidaService.validateHojaVida(hojaVida);
        if (!validation.isValid) {
            Swal.fire({
                icon: 'error',
                title: 'Errores de validación',
                html: validation.errors.join('<br>')
            });
            return;
        }

        // Enviar al servicio
        this.hojaVidaService.register(hojaVida).subscribe({
            next: (response) => {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Hoja de vida registrada correctamente'
                });
                this.limpiar();
            },
            error: (error) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al registrar la hoja de vida: ' + (error.error?.message || error.message)
                });
            }
        });
    }

    // Procesar archivo Excel/CSV para previsualización
    processExcelFile(): void {
        if (!this.selectedFile) {
            Swal.fire({
                icon: 'warning',
                title: 'No hay archivo',
                text: 'Por favor selecciona un archivo Excel o CSV primero'
            });
            return;
        }

        this.isProcessing = true;
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                let jsonData: any[];

                // Verificar si es un archivo CSV o Excel
                if (this.selectedFile!.name.toLowerCase().endsWith('.csv')) {
                    // Procesar como CSV
                    const csvText = e.target.result as string;
                    // Remover BOM si existe
                    const cleanText = csvText.replace(/^\uFEFF/, '');
                    const lines = cleanText.split('\n').filter(line => line.trim() !== '');
                    jsonData = lines.map(line => line.split(';').map(cell => cell.trim()));
                } else {
                    // Procesar como Excel
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                }

                if (jsonData.length < 2) {
                    throw new Error('El archivo debe contener al menos una fila de datos además de los encabezados');
                }

                const headers = jsonData[0] as string[];
                const expectedHeaders = [
                    'PKEYHOJAVIDA', 'PKEYASPIRANT', 'CODIPROGACAD', 'ANNOPERIACAD', 'NUMEPERIACAD',
                    'CODIGO_INSCRIPCION', 'DOCUMENTO', 'NOMBRE', 'PRIMER_APELLIDO', 'SEGUNDO_APELLIDO',
                    'EDAD', 'GENERO', 'FECH_NACIMIENTO', 'CORREO', 'TELEFONO', 'CELULAR',
                    'DIRECCION', 'CIUDAD', 'ESTADO', 'DEPARTAMENTO', 'REGIONAL',
                    'COMPLEMENTARIA_1', 'COMPLEMENTARIA_2', 'FECHA_INSCRIPCION', 'GRUP_MINO',
                    'ESTRATO', 'TIPO_MEDIO', 'COLEGIO'
                ];

                // Validar encabezados
                const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
                if (missingHeaders.length > 0) {
                    throw new Error(`Faltan las siguientes columnas: ${missingHeaders.join(', ')}`);
                }

                // Procesar datos
                this.previewData = [];
                this.validationErrors = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i] as any[];
                    const rowData: any = {};

                    headers.forEach((header, index) => {
                        rowData[header] = row[index] || '';
                    });

                    // Validar cada fila
                    const validation = this.hojaVidaService.validateHojaVida(rowData);
                    if (!validation.isValid) {
                        this.validationErrors.push({
                            fila: i + 1,
                            errores: validation.errors,
                            data: rowData
                        });
                    }

                    this.previewData.push({
                        fila: i + 1,
                        data: rowData,
                        isValid: validation.isValid,
                        errors: validation.errors
                    });
                }

                this.showPreview = true;
                this.isProcessing = false;
                
                // Inicializar datos filtrados
                this.previewFilteredData = [...this.previewData];
                this.previewCurrentPage = 1;

                if (this.validationErrors.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Errores de validación encontrados',
                        html: `Se encontraron ${this.validationErrors.length} filas con errores. Revisa la previsualización para más detalles.`,
                        confirmButtonText: 'Revisar'
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Archivo válido',
                        text: `${this.previewData.length} registros listos para procesar`,
                        confirmButtonText: 'Continuar'
                    });
                }

            } catch (error: any) {
                this.isProcessing = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error al procesar archivo',
                    text: error.message || 'Error desconocido al procesar el archivo'
                });
            }
        };

        // Leer el archivo según su tipo
        if (this.selectedFile.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(this.selectedFile, 'UTF-8');
        } else {
            reader.readAsArrayBuffer(this.selectedFile);
        }
    }

    // Confirmar y enviar datos masivos
    confirmBulkSave(): void {
        const validRecords = this.previewData.filter(item => item.isValid);

        if (validRecords.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'No hay registros válidos',
                text: 'Corrige los errores antes de continuar'
            });
            return;
        }

        Swal.fire({
            title: '¿Confirmar guardado masivo?',
            html: `Se guardarán ${validRecords.length} registros válidos.<br>Los registros con errores serán omitidos.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.saveBulkData(validRecords);
            }
        });
    }

    // Guardar datos masivos
    private saveBulkData(validRecords: any[]): void {
        this.isProcessing = true;
        const hojasVida = validRecords.map(record => record.data);

        this.hojaVidaService.registerBulk(hojasVida).subscribe({
            next: (response) => {
                this.isProcessing = false;
                this.hasErrors = false;
                
                // Procesar respuesta exitosa
                this.successfulRecords = response.response?.hojas_vida || [];
                this.duplicateRecords = [];
                this.processingMessage = response.response?.mensaje || 'Procesamiento completado';
                
                this.showResults = true;
                this.showPreview = false;

                Swal.fire({
                    icon: 'success',
                    title: 'Carga masiva completada',
                    text: this.processingMessage
                });
            },
            error: (error) => {
                this.isProcessing = false;
                
                // Verificar si es error de documentos duplicados (409)
                if (error.status === 409 && error.error?.response) {
                    this.hasErrors = true;
                    this.successfulRecords = [];
                    this.duplicateRecords = error.error.response.documentos_duplicados || [];
                    this.processingMessage = error.error.response.mensaje || 'Se encontraron documentos duplicados';
                    
                    this.showResults = true;
                    this.showPreview = false;

                    Swal.fire({
                        icon: 'warning',
                        title: 'Documentos duplicados encontrados',
                        text: this.processingMessage,
                        confirmButtonText: 'Ver detalles'
                    });
                } else {
                    // Otros errores
                    Swal.fire({
                        icon: 'error',
                        title: 'Error en carga masiva',
                        text: 'Error al procesar los registros: ' + (error.error?.message || error.message)
                    });
                }
            }
        });
    }

    // Cancelar previsualización
    cancelPreview(): void {
        this.showPreview = false;
        this.previewData = [];
        this.validationErrors = [];
        this.previewSearchTerm = '';
        this.previewCurrentPage = 1;
        this.previewFilteredData = [];
    }

    // Filtrar datos de previsualización
    filtrarPreviewData(): void {
        if (!this.previewSearchTerm.trim()) {
            this.previewFilteredData = [...this.previewData];
        } else {
            const searchTerm = this.previewSearchTerm.toLowerCase().trim();
            this.previewFilteredData = this.previewData.filter(item => {
                const data = item.data;
                return (
                    (data.DOCUMENTO && data.DOCUMENTO.toString().toLowerCase().includes(searchTerm)) ||
                    (data.NOMBRE && data.NOMBRE.toLowerCase().includes(searchTerm)) ||
                    (data.PRIMER_APELLIDO && data.PRIMER_APELLIDO.toLowerCase().includes(searchTerm)) ||
                    (data.SEGUNDO_APELLIDO && data.SEGUNDO_APELLIDO.toLowerCase().includes(searchTerm)) ||
                    (data.CORREO && data.CORREO.toLowerCase().includes(searchTerm)) ||
                    (data.CODIPROGACAD && data.CODIPROGACAD.toString().toLowerCase().includes(searchTerm)) ||
                    (data.CIUDAD && data.CIUDAD.toLowerCase().includes(searchTerm))
                );
            });
        }
        this.previewCurrentPage = 1; // Reset a la primera página
    }

    // Obtener datos paginados de previsualización
    get previewDataPaginados(): any[] {
        const startIndex = (this.previewCurrentPage - 1) * this.previewItemsPerPage;
        const endIndex = startIndex + this.previewItemsPerPage;
        return this.previewFilteredData.slice(startIndex, endIndex);
    }

    // Obtener total de páginas de previsualización
    get previewTotalPages(): number {
        return Math.ceil(this.previewFilteredData.length / this.previewItemsPerPage);
    }

    // Cambiar página de previsualización
    cambiarPaginaPreview(page: number): void {
        if (page >= 1 && page <= this.previewTotalPages) {
            this.previewCurrentPage = page;
        }
    }

    // Obtener array de páginas para previsualización
    get previewPaginasArray(): number[] {
        const totalPages = this.previewTotalPages;
        const currentPage = this.previewCurrentPage;
        const pages: number[] = [];
        
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push(-1); // Indicador de "..."
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push(-1); // Indicador de "..."
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push(-1); // Indicador de "..."
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push(-1); // Indicador de "..."
                pages.push(totalPages);
            }
        }
        
        return pages;
    }

    // Obtener cantidad de registros válidos
    get previewValidCount(): number {
        return this.previewData.filter(item => item.isValid).length;
    }

    // Obtener cantidad de registros con errores
    get previewErrorCount(): number {
        return this.previewData.filter(item => !item.isValid).length;
    }

    limpiar(): void {
        this.form.reset();
        this.submitted = false;
        this.form.patchValue({
            annoPeriacad: new Date().getFullYear(),
            numePeriacad: '1',
            genero: 'Masculino',
            estado: 'Activo',
            grupMino: 'Ninguno',
            estrato: '3',
            tipoMedio: 'Web',
            fechaInscripcion: new Date().toISOString().split('T')[0]
        });
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel';
            const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');

            if (isExcel || isCsv) {
                this.selectedFile = file;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Archivo inválido',
                    text: 'Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv)'
                });
                event.target.value = '';
            }
        }
    }

    downloadTemplate(): void {
        const headers = [
            'PKEYHOJAVIDA', 'PKEYASPIRANT', 'CODIPROGACAD', 'ANNOPERIACAD', 'NUMEPERIACAD',
            'CODIGO_INSCRIPCION', 'DOCUMENTO', 'NOMBRE', 'PRIMER_APELLIDO', 'SEGUNDO_APELLIDO',
            'EDAD', 'GENERO', 'FECH_NACIMIENTO', 'CORREO', 'TELEFONO', 'CELULAR',
            'DIRECCION', 'CIUDAD', 'ESTADO', 'DEPARTAMENTO', 'REGIONAL',
            'COMPLEMENTARIA_1', 'COMPLEMENTARIA_2', 'FECHA_INSCRIPCION', 'GRUP_MINO',
            'ESTRATO', 'TIPO_MEDIO', 'COLEGIO'
        ];

        // Crear un nuevo libro de trabajo
        const workbook = XLSX.utils.book_new();

        // Crear una hoja con solo los encabezados
        const worksheet = XLSX.utils.aoa_to_sheet([headers]);

        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');

        // Generar el archivo Excel y descargarlo
        XLSX.writeFile(workbook, 'plantilla_hoja_vida.xlsx');
    }

    clearResults(): void {
        this.uploadResults = [];
        this.showResults = false;
        this.previewData = [];
        this.showPreview = false;
        this.validationErrors = [];
        this.selectedFile = null;
        
        // Limpiar nuevas variables de resultados
        this.successfulRecords = [];
        this.duplicateRecords = [];
        this.processingMessage = '';
        this.hasErrors = false;

        // Limpiar el input de archivo
        const fileInput = document.getElementById('excelFile') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }
    // Mostrar detalles de una fila específica
    showRowDetails(item: any): void {
        const data = item.data;
        const errors = item.errors || [];

        let html = '<div class="text-start" style="font-family: Arial, sans-serif;">';
        
        // Header con estado
        html += `<div class="d-flex align-items-center mb-3">`;
        html += `<h5 class="mb-0 me-3">Detalles del Registro - Fila ${item.fila}</h5>`;
        const statusBadge = item.isValid ? 
            '<span class="badge bg-success">✓ Válido</span>' : 
            '<span class="badge bg-danger">✗ Con Errores</span>';
        html += statusBadge;
        html += `</div>`;

        // Información Personal
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-primary text-white"><strong>📋 Información Personal</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const personalFields = [
            { key: 'DOCUMENTO', label: '🆔 Documento', icon: '🆔' },
            { key: 'NOMBRE', label: '👤 Nombre', icon: '👤' },
            { key: 'PRIMER_APELLIDO', label: '👤 Primer Apellido', icon: '👤' },
            { key: 'SEGUNDO_APELLIDO', label: '👤 Segundo Apellido', icon: '👤' },
            { key: 'EDAD', label: '🎂 Edad', icon: '🎂' },
            { key: 'GENERO', label: '⚧ Género', icon: '⚧' },
            { key: 'FECH_NACIMIENTO', label: '📅 Fecha de Nacimiento', icon: '📅' }
        ];

        personalFields.forEach(field => {
            const value = data[field.key] || 'N/A';
            const hasError = errors.some((error: string) => error.includes(field.label.replace(/[🆔👤🎂⚧📅]/g, '').trim()));
            const colorClass = hasError ? 'text-danger fw-bold' : 'text-dark';
            const bgClass = hasError ? 'bg-danger bg-opacity-10' : '';

            html += `<div class="col-md-6 mb-2 p-2 ${bgClass}" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="${colorClass}" style="font-size: 1.1em;">${value}</span>`;
            html += `</div>`;
        });
        
        html += '</div></div></div>';

        // Información de Contacto
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-info text-white"><strong>📞 Información de Contacto</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const contactFields = [
            { key: 'CORREO', label: '📧 Correo Electrónico', icon: '📧' },
            { key: 'TELEFONO', label: '☎️ Teléfono', icon: '☎️' },
            { key: 'CELULAR', label: '📱 Celular', icon: '📱' },
            { key: 'DIRECCION', label: '🏠 Dirección', icon: '🏠' }
        ];

        contactFields.forEach(field => {
            const value = data[field.key] || 'N/A';
            const hasError = errors.some((error: string) => error.includes(field.label.replace(/[📧☎️📱🏠]/g, '').trim()));
            const colorClass = hasError ? 'text-danger fw-bold' : 'text-dark';
            const bgClass = hasError ? 'bg-danger bg-opacity-10' : '';

            html += `<div class="col-md-6 mb-2 p-2 ${bgClass}" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="${colorClass}" style="font-size: 1.1em;">${value}</span>`;
            html += `</div>`;
        });
        
        html += '</div></div></div>';

        // Información Académica y Ubicación
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-success text-white"><strong>🎓 Información Académica y Ubicación</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const academicFields = [
            { key: 'CODIPROGACAD', label: '🎓 Programa Académico', icon: '🎓' },
            { key: 'ANNOPERIACAD', label: '📅 Año Período Académico', icon: '📅' },
            { key: 'NUMEPERIACAD', label: '🔢 Número Período Académico', icon: '🔢' },
            { key: 'CIUDAD', label: '🏙️ Ciudad', icon: '🏙️' },
            { key: 'DEPARTAMENTO', label: '🗺️ Departamento', icon: '🗺️' },
            { key: 'REGIONAL', label: '🏢 Regional', icon: '🏢' },
            { key: 'COLEGIO', label: '🏫 Colegio', icon: '🏫' }
        ];

        academicFields.forEach(field => {
            const value = data[field.key] || 'N/A';
            const hasError = errors.some((error: string) => error.includes(field.label.replace(/[🎓📅🔢🏙️🗺️🏢🏫]/g, '').trim()));
            const colorClass = hasError ? 'text-danger fw-bold' : 'text-dark';
            const bgClass = hasError ? 'bg-danger bg-opacity-10' : '';

            html += `<div class="col-md-6 mb-2 p-2 ${bgClass}" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="${colorClass}" style="font-size: 1.1em;">${value}</span>`;
            html += `</div>`;
        });
        
        html += '</div></div></div>';

        // Información Adicional
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-warning text-dark"><strong>ℹ️ Información Adicional</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const additionalFields = [
            { key: 'CODIGO_INSCRIPCION', label: '🎫 Código de Inscripción', icon: '🎫' },
            { key: 'FECHA_INSCRIPCION', label: '📅 Fecha de Inscripción', icon: '📅' },
            { key: 'ESTADO', label: '📊 Estado', icon: '📊' },
            { key: 'ESTRATO', label: '🏘️ Estrato', icon: '🏘️' },
            { key: 'GRUP_MINO', label: '👥 Grupo Minoritario', icon: '👥' },
            { key: 'TIPO_MEDIO', label: '📺 Tipo de Medio', icon: '📺' },
            { key: 'COMPLEMENTARIA_1', label: '📝 Info Complementaria 1', icon: '📝' },
            { key: 'COMPLEMENTARIA_2', label: '📝 Info Complementaria 2', icon: '📝' }
        ];

        additionalFields.forEach(field => {
            const value = data[field.key] || 'N/A';
            const hasError = errors.some((error: string) => error.includes(field.label.replace(/[🎫📅📊🏘️👥📺📝]/g, '').trim()));
            const colorClass = hasError ? 'text-danger fw-bold' : 'text-dark';
            const bgClass = hasError ? 'bg-danger bg-opacity-10' : '';

            html += `<div class="col-md-6 mb-2 p-2 ${bgClass}" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="${colorClass}" style="font-size: 1.1em;">${value}</span>`;
            html += `</div>`;
        });
        
        html += '</div></div></div>';

        // IDs del Sistema
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-secondary text-white"><strong>🔑 IDs del Sistema</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const systemFields = [
            { key: 'PKEYHOJAVIDA', label: '🔑 ID Hoja de Vida', icon: '🔑' },
            { key: 'PKEYASPIRANT', label: '🔑 ID Aspirante', icon: '🔑' }
        ];

        systemFields.forEach(field => {
            const value = data[field.key] || 'N/A';
            const hasError = errors.some((error: string) => error.includes(field.label.replace(/[🔑]/g, '').trim()));
            const colorClass = hasError ? 'text-danger fw-bold' : 'text-dark';
            const bgClass = hasError ? 'bg-danger bg-opacity-10' : '';

            html += `<div class="col-md-6 mb-2 p-2 ${bgClass}" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="${colorClass}" style="font-size: 1.1em; font-family: monospace;">${value}</span>`;
            html += `</div>`;
        });
        
        html += '</div></div></div>';

        // Errores (si los hay)
        if (errors.length > 0) {
            html += '<div class="card border-danger">';
            html += '<div class="card-header bg-danger text-white"><strong>❌ Errores Encontrados</strong></div>';
            html += '<div class="card-body">';
            html += '<div class="alert alert-danger">';
            html += '<ul class="mb-0">';
            errors.forEach((error: string) => {
                html += `<li class="mb-1"><strong>⚠️ ${error}</strong></li>`;
            });
            html += '</ul>';
            html += '</div></div></div>';
        }

        html += '</div>';

        Swal.fire({
            title: item.isValid ? '✅ Registro Válido' : '❌ Registro con Errores',
            html: html,
            icon: item.isValid ? 'success' : 'error',
            width: '900px',
            showCloseButton: true,
            confirmButtonText: 'Cerrar',
            customClass: {
                popup: 'swal-wide'
            }
        });
    }

    // Métodos para consulta de hojas de vida
    consultarHojasVida(): void {
        this.isLoadingConsulta = true;
        
        this.hojaVidaService.consultarHojasVida().subscribe({
            next: (response) => {
                this.isLoadingConsulta = false;
                
                if (response.error === 0) {
                    // La estructura correcta para hojas-vida-full es response.response.data
                    this.hojasVidaExistentes = response.response?.data || [];
                    this.totalItems = this.hojasVidaExistentes.length;
                    
                    this.filtrarHojasVida();
                    
                    // Mostrar mensaje de éxito
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
                
                if (error.status === 401) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Sesión Expirada',
                        text: 'Tu sesión ha expirado. Serás redirigido al login.',
                        timer: 3000,
                        showConfirmButton: false
                    });
                    this.authService.handleAuthError();
                    return;
                }
                
                if (!this.authService.getToken()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Sesión Requerida',
                        text: 'Debes iniciar sesión para acceder a esta función.',
                        timer: 3000,
                        showConfirmButton: false
                    });
                    this.authService.handleAuthError();
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

    // Filtrar hojas de vida por término de búsqueda
    filtrarHojasVida(): void {
        if (!this.searchTerm.trim()) {
            this.hojasVidaFiltradas = [...this.hojasVidaExistentes];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.hojasVidaFiltradas = this.hojasVidaExistentes.filter(hoja => 
                hoja.DOCUMENTO?.toString().toLowerCase().includes(term) ||
                hoja.NOMBRE?.toLowerCase().includes(term) ||
                hoja.PRIMER_APELLIDO?.toLowerCase().includes(term) ||
                hoja.CORREO?.toLowerCase().includes(term) ||
                hoja.CIUDAD?.toLowerCase().includes(term)
            );
        }
        this.currentPage = 1; // Resetear a la primera página
    }

    // Obtener hojas de vida para la página actual
    get hojasVidaPaginadas(): any[] {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.hojasVidaFiltradas.slice(startIndex, endIndex);
    }

    // Obtener número total de páginas
    get totalPages(): number {
        return Math.ceil(this.hojasVidaFiltradas.length / this.itemsPerPage);
    }

    // Cambiar página
    cambiarPagina(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    // Obtener array de páginas para mostrar en el paginador
    get paginasArray(): number[] {
        const pages = [];
        for (let i = 1; i <= this.totalPages; i++) {
            pages.push(i);
        }
        return pages;
    }

    // Formatear fecha
    formatearFecha(fecha: string): string {
        if (!fecha) return 'N/A';
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-ES');
        } catch {
            return fecha;
        }
    }

    // Obtener clase CSS para el badge según el estado
    getBadgeClass(estado: string): string {
        if (!estado) return 'bg-secondary';
        
        const estadoNormalizado = estado.toString().trim().toUpperCase();
        
        switch (estadoNormalizado) {
            case 'ACTIVO':
                return 'bg-success';
            case 'PENDIENTE':
                return 'bg-warning';
            case 'RECHAZADO':
                return 'bg-danger';
            case 'ADMITIDO':
                return 'bg-info';
            default:
                return 'bg-secondary';
        }
    }

    // Ver detalle completo de una hoja de vida
    verDetalleHoja(hoja: any): void {
        let html = '<div class="text-start" style="font-family: Arial, sans-serif;">';
        
        // Header con estado
        html += `<div class="d-flex align-items-center mb-3">`;
        html += `<h5 class="mb-0 me-3">Detalle de Hoja de Vida</h5>`;
        const statusBadge = this.getBadgeClass(hoja.ESTADO);
        html += `<span class="badge ${statusBadge}"><span class="me-1">●</span>${hoja.ESTADO}</span>`;
        html += `</div>`;

        // Información Personal
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-primary text-white"><strong>📋 Información Personal</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const personalFields = [
            { key: 'DOCUMENTO', label: '🆔 Documento' },
            { key: 'NOMBRE', label: '👤 Nombre' },
            { key: 'PRIMER_APELLIDO', label: '👤 Primer Apellido' },
            { key: 'SEGUNDO_APELLIDO', label: '👤 Segundo Apellido' },
            { key: 'EDAD', label: '🎂 Edad' },
            { key: 'GENERO', label: '⚧ Género' },
            { key: 'FECH_NACIMIENTO', label: '📅 Fecha de Nacimiento' }
        ];

        personalFields.forEach(field => {
            const value = hoja[field.key] || 'N/A';
            if (value !== 'N/A' && value !== '' && value !== null && value !== undefined) {
                html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
                html += `<strong class="text-muted">${field.label}:</strong><br>`;
                html += `<span class="text-dark" style="font-size: 1.1em;">${value}</span>`;
                html += `</div>`;
            }
        });
        
        html += '</div></div></div>';

        // Información de Contacto
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-info text-white"><strong>📞 Información de Contacto</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const contactFields = [
            { key: 'CORREO', label: '📧 Correo Electrónico' },
            { key: 'TELEFONO', label: '📞 Teléfono' },
            { key: 'CELULAR', label: '📱 Celular' },
            { key: 'DIRECCION', label: '🏠 Dirección' }
        ];

        contactFields.forEach(field => {
            const value = hoja[field.key] || 'N/A';
            if (value !== 'N/A' && value !== '' && value !== null && value !== undefined) {
                html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
                html += `<strong class="text-muted">${field.label}:</strong><br>`;
                html += `<span class="text-dark" style="font-size: 1.1em;">${value}</span>`;
                html += `</div>`;
            }
        });
        
        html += '</div></div></div>';

        // Información Académica y Ubicación
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-success text-white"><strong>🎓 Información Académica y Ubicación</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const academicFields = [
            { key: 'CODIPROGACAD', label: '🎓 Programa Académico' },
            { key: 'ANNOPERIACAD', label: '📅 Año Período Académico' },
            { key: 'NUMEPERIACAD', label: '🔢 Número Período Académico' },
            { key: 'CIUDAD', label: '🏙️ Ciudad' },
            { key: 'DEPARTAMENTO', label: '🗺️ Departamento' },
            { key: 'REGIONAL', label: '🏢 Regional' },
            { key: 'COLEGIO', label: '🏫 Colegio' }
        ];

        academicFields.forEach(field => {
            const value = hoja[field.key] || 'N/A';
            if (value !== 'N/A' && value !== '' && value !== null && value !== undefined) {
                html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
                html += `<strong class="text-muted">${field.label}:</strong><br>`;
                html += `<span class="text-dark" style="font-size: 1.1em;">${value}</span>`;
                html += `</div>`;
            }
        });
        
        html += '</div></div></div>';

        // Información Adicional
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-warning text-dark"><strong>ℹ️ Información Adicional</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const additionalFields = [
            { key: 'CODIGO_INSCRIPCION', label: '🎫 Código de Inscripción' },
            { key: 'FECHA_INSCRIPCION', label: '📅 Fecha de Inscripción' },
            { key: 'ESTRATO', label: '🏘️ Estrato' },
            { key: 'GRUP_MINO', label: '👥 Grupo Minoritario' },
            { key: 'TIPO_MEDIO', label: '📺 Tipo de Medio' },
            { key: 'COMPLEMENTARIA_1', label: '📝 Info Complementaria 1' },
            { key: 'COMPLEMENTARIA_2', label: '📝 Info Complementaria 2' }
        ];

        additionalFields.forEach(field => {
            const value = hoja[field.key] || 'N/A';
            if (value !== 'N/A' && value !== '' && value !== null && value !== undefined) {
                html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
                html += `<strong class="text-muted">${field.label}:</strong><br>`;
                html += `<span class="text-dark" style="font-size: 1.1em;">${value}</span>`;
                html += `</div>`;
            }
        });
        
        html += '</div></div></div>';

        // Información Médica (si existe)
        if (hoja.EXAMENES || hoja.FECHA_HORA || hoja.RECOMENDACIONES || hoja.IPS_ID || hoja.NOMBREIPS) {
            html += '<div class="card mb-3 shadow">';
            html += '<div class="card-header bg-danger text-white"><strong>🏥 Información Médica</strong></div>';
            html += '<div class="card-body">';
            html += '<div class="row">';
            
            const medicalFields = [
                { key: 'EXAMENES', label: '🔬 Exámenes' },
                { key: 'FECHA_HORA', label: '📅 Fecha y Hora', isDateTime: true },
                { key: 'IPS_ID', label: '🏥 ID IPS' },
                { key: 'NOMBREIPS', label: '🏥 Nombre IPS' }
            ];

            medicalFields.forEach(field => {
                let value = hoja[field.key] || 'N/A';
                if (value !== 'N/A' && value !== '' && value !== null && value !== undefined) {
                    if (field.isDateTime && value !== 'N/A') {
                        value = this.formatearFecha(value);
                    }
                    html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
                    html += `<strong class="text-muted">${field.label}:</strong><br>`;
                    html += `<span class="text-dark" style="font-size: 1.1em;">${value}</span>`;
                    html += `</div>`;
                }
            });

            // Recomendaciones en toda la fila si existe
            if (hoja.RECOMENDACIONES && hoja.RECOMENDACIONES !== 'N/A' && hoja.RECOMENDACIONES !== '') {
                html += `<div class="col-12 mb-2 p-2" style="border-radius: 5px;">`;
                html += `<strong class="text-muted">💊 Recomendaciones:</strong><br>`;
                html += `<div class="alert alert-info mt-2" style="font-size: 1.1em;">${hoja.RECOMENDACIONES}</div>`;
                html += `</div>`;
            }
            
            html += '</div></div></div>';
        }

        // Información del Sistema
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-secondary text-white"><strong>🔑 Información del Sistema</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const systemFields = [
            { key: 'PKEYHOJAVIDA', label: '🔑 ID Hoja de Vida' },
            { key: 'PKEYASPIRANT', label: '🔑 ID Aspirante' },
            { key: 'createdAt', label: '📅 Fecha de Creación', isDate: true },
            { key: 'updatedAt', label: '📅 Última Actualización', isDate: true }
        ];

        systemFields.forEach(field => {
            let value = hoja[field.key] || 'N/A';
            if (value !== 'N/A' && value !== '' && value !== null && value !== undefined) {
                if (field.isDate && value !== 'N/A') {
                    value = this.formatearFecha(value);
                }
                html += `<div class="col-md-6 mb-2 p-2" style="border-radius: 5px;">`;
                html += `<strong class="text-muted">${field.label}:</strong><br>`;
                html += `<span class="text-dark" style="font-size: 1.1em; font-family: monospace;">${value}</span>`;
                html += `</div>`;
            }
        });

        // Detalle de procesamiento si existe
        if (hoja.DETALLE && hoja.DETALLE !== 'N/A' && hoja.DETALLE !== '') {
            html += `<div class="col-12 mb-2 p-2" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">📋 Detalle de Procesamiento:</strong><br>`;
            html += `<div class="alert alert-secondary mt-2" style="font-size: 0.9em; font-family: monospace;">${hoja.DETALLE}</div>`;
            html += `</div>`;
        }
        
        html += '</div></div></div>';

        // Sección de PDF (cuando existe PDF_URL)
        if (hoja.PDF_URL) {
            html += '<div class="card mb-3 shadow">';
            html += '<div class="card-header bg-info text-white">';
            html += '<h6 class="mb-0"><i class="fas fa-file-pdf me-2"></i>Documento PDF</h6>';
            html += '</div>';
            html += '<div class="card-body text-center">';

            // Extraer el nombre del archivo de la URL
            const filename = hoja.PDF_URL.split('/').pop();

            html += `<div class="mb-3">`;
            html += `<i class="fas fa-file-pdf text-danger" style="font-size: 3rem;"></i>`;
            html += `<p class="mt-2 mb-3"><strong>Archivo PDF disponible</strong></p>`;
            html += `<button type="button" class="btn btn-primary" id="verPdfBtn">`;
            html += `<i class="fas fa-eye me-2"></i>Ver PDF`;
            html += `</button>`;
            html += `</div>`;

            html += '</div></div>';
        }

        html += '</div>';

        Swal.fire({
            title: `${hoja.NOMBRE} ${hoja.PRIMER_APELLIDO} ${hoja.SEGUNDO_APELLIDO || ''}`,
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
            }
        });
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
        this.hojaVidaService.obtenerPDF(filename).subscribe({
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

    ngAfterViewInit(): void {
        // Los gráficos se inicializarán cuando se seleccione la pestaña de gráficas
    }

    ngOnDestroy(): void {
        // this.detenerActualizacionAutomatica(); // Deshabilitado
        this.destruirGraficas();
    }

    iniciarGraficas(): void {
        this.cargarDatosGraficas();
    }

    cargarDatosGraficas(): void {
        this.hojaVidaService.consultarHojasVida().subscribe({
            next: (response) => {
                if (response.error === 0 && response.response?.data) {
                    const datos = response.response.data;
                    this.procesarDatosParaGraficas(datos);
                    this.ultimaActualizacion = new Date();
                    
                    // Crear gráficas después de un pequeño delay para asegurar que los elementos estén en el DOM
                    setTimeout(() => {
                        this.crearGraficas();
                    }, 100);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudieron cargar los datos para las gráficas'
                    });
                }
            },
            error: (error) => {
                console.error('Error al cargar datos para gráficas:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al conectar con el servidor'
                });
            }
        });
    }

    procesarDatosParaGraficas(datos: any[]): void {
        this.totalHojasVida = datos.length;
        
        // Procesar estadísticas por estado
        this.estadisticasEstado = {};
        datos.forEach(item => {
            const estado = item.ESTADO || 'Sin Estado';
            this.estadisticasEstado[estado] = (this.estadisticasEstado[estado] || 0) + 1;
        });

        // Procesar estadísticas por ciudad (top 10)
        const ciudadCount: any = {};
        datos.forEach(item => {
            const ciudad = item.CIUDAD || 'Sin Ciudad';
            ciudadCount[ciudad] = (ciudadCount[ciudad] || 0) + 1;
        });

        // Obtener top 10 ciudades
        this.estadisticasCiudad = Object.entries(ciudadCount)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 10)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {} as any);
    }

    crearGraficas(): void {
        this.destruirGraficas();
        this.crearGraficaTorta();
        this.crearGraficaBarras();
        this.crearGraficaCiudades();
    }

    crearGraficaTorta(): void {
        if (!this.pieChartRef?.nativeElement) return;

        const ctx = this.pieChartRef.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = Object.keys(this.estadisticasEstado);
        const data = Object.values(this.estadisticasEstado);
        const colors = this.generarColores(labels.length);

        const config: ChartConfiguration = {
            type: 'pie' as ChartType,
            data: {
                labels: labels,
                datasets: [{
                    data: data as number[],
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        this.pieChart = new Chart(ctx, config);
    }

    crearGraficaBarras(): void {
        if (!this.barChartRef?.nativeElement) return;

        const ctx = this.barChartRef.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = Object.keys(this.estadisticasEstado);
        const data = Object.values(this.estadisticasEstado);
        const colors = this.generarColores(labels.length);

        const config: ChartConfiguration = {
            type: 'bar' as ChartType,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cantidad',
                    data: data as number[],
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        };

        this.barChart = new Chart(ctx, config);
    }

    crearGraficaCiudades(): void {
        if (!this.cityChartRef?.nativeElement) return;

        const ctx = this.cityChartRef.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = Object.keys(this.estadisticasCiudad);
        const data = Object.values(this.estadisticasCiudad);
        const colors = this.generarColores(labels.length);

        const config: ChartConfiguration = {
            type: 'bar' as ChartType,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cantidad',
                    data: data as number[],
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y' as const,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        };

        this.cityChart = new Chart(ctx, config);
    }

    generarColores(cantidad: number): string[] {
        const colores = [
            'rgba(54, 162, 235, 0.8)',   // Azul
            'rgba(255, 99, 132, 0.8)',   // Rojo
            'rgba(255, 205, 86, 0.8)',   // Amarillo
            'rgba(75, 192, 192, 0.8)',   // Verde agua
            'rgba(153, 102, 255, 0.8)',  // Púrpura
            'rgba(255, 159, 64, 0.8)',   // Naranja
            'rgba(199, 199, 199, 0.8)',  // Gris
            'rgba(83, 102, 255, 0.8)',   // Azul índigo
            'rgba(255, 99, 255, 0.8)',   // Magenta
            'rgba(99, 255, 132, 0.8)'    // Verde lima
        ];

        const resultado = [];
        for (let i = 0; i < cantidad; i++) {
            resultado.push(colores[i % colores.length]);
        }
        return resultado;
    }

    // Métodos de actualización automática deshabilitados para evitar recarga constante
    // iniciarActualizacionAutomatica(): void {
    //     this.detenerActualizacionAutomatica();
    //     this.intervalId = setInterval(() => {
    //         if (this.activeTab === 'graficas') {
    //             this.cargarDatosGraficas();
    //         }
    //     }, 5000); // Actualizar cada 5 segundos
    // }

    // detenerActualizacionAutomatica(): void {
    //     if (this.intervalId) {
    //         clearInterval(this.intervalId);
    //         this.intervalId = null;
    //     }
    // }

    destruirGraficas(): void {
        if (this.pieChart) {
            this.pieChart.destroy();
            this.pieChart = null;
        }
        if (this.barChart) {
            this.barChart.destroy();
            this.barChart = null;
        }
        if (this.cityChart) {
            this.cityChart.destroy();
            this.cityChart = null;
        }
    }

    descargarExcel(): void {
        this.isLoadingConsulta = true;
        
        if (this.hojasVidaExistentes.length === 0) {
            // Si no hay datos cargados, cargarlos primero
            this.hojaVidaService.consultarHojasVida().subscribe({
                next: (response) => {
                    if (response.error === 0 && response.response?.data) {
                        this.generarExcel(response.response.data);
                        this.isLoadingConsulta = false;
                    } else {
                        this.isLoadingConsulta = false;
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudieron cargar los datos para exportar'
                        });
                    }
                },
                error: (error) => {
                    console.error('Error al cargar datos para Excel:', error);
                    this.isLoadingConsulta = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error al conectar con el servidor'
                    });
                }
            });
        } else {
            this.generarExcel(this.hojasVidaExistentes);
            this.isLoadingConsulta = false;
        }
    }

    generarExcel(datos: any[]): void {
        try {
            // Filtrar y limpiar los datos (excluir PDF_URL y USUARIO_ID)
            const datosLimpios = datos.map(item => {
                const { PDF_URL, USUARIO_ID, ...resto } = item;
                return resto;
            });

            // Crear el libro de trabajo
            const ws = XLSX.utils.json_to_sheet(datosLimpios);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Hojas de Vida');

            // Configurar el ancho de las columnas
            const colWidths = Object.keys(datosLimpios[0] || {}).map(() => ({ wch: 20 }));
            ws['!cols'] = colWidths;

            // Generar el archivo
            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `hojas_de_vida_${fecha}.xlsx`;
            
            XLSX.writeFile(wb, nombreArchivo);

            Swal.fire({
                icon: 'success',
                title: 'Descarga Exitosa',
                text: `El archivo ${nombreArchivo} se ha descargado correctamente`,
                timer: 3000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error al generar Excel:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al generar el archivo Excel'
            });
        }
    }

}