import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { RegisterHojaVidaService } from './hoja.service';
import { AuthService } from '../../../core/auth.service';

@Component({
    selector: 'app-hoja-vida',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './hoja-vida.html',
    styleUrls: ['./hoja-vida.css']
})
export class HojaVida {
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
        const statusBadge = hoja.ESTADO === 'ACTIVO' ? 
            '<span class="badge bg-success">✓ Activo</span>' : 
            hoja.ESTADO === 'PENDIENTE' ? 
            '<span class="badge bg-warning">⏳ Pendiente</span>' :
            '<span class="badge bg-danger">✗ Inactivo</span>';
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
            const value = hoja[field.key] || 'N/A';
            const hasError = false; // En este caso no hay validación de errores
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
            { key: 'TELEFONO', label: '📞 Teléfono', icon: '📞' },
            { key: 'CELULAR', label: '📱 Celular', icon: '📱' },
            { key: 'DIRECCION', label: '🏠 Dirección', icon: '🏠' }
        ];

        contactFields.forEach(field => {
            const value = hoja[field.key] || 'N/A';
            const hasError = false;
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
            const value = hoja[field.key] || 'N/A';
            const hasError = false;
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
            let value = hoja[field.key] || 'N/A';
            const hasError = false;
            const colorClass = hasError ? 'text-danger fw-bold' : 'text-dark';
            const bgClass = hasError ? 'bg-danger bg-opacity-10' : '';

            if (field.key === 'ESTADO') {
                const badgeClass = value === 'ACTIVO' ? 'bg-success' : value === 'PENDIENTE' ? 'bg-warning' : 'bg-danger';
                value = `<span class="badge ${badgeClass}">${value}</span>`;
            }

            html += `<div class="col-md-6 mb-2 p-2 ${bgClass}" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="${colorClass}" style="font-size: 1.1em;">${value}</span>`;
            html += `</div>`;
        });
        
        html += '</div></div></div>';

        // IDs del Sistema y Fechas
        html += '<div class="card mb-3 shadow">';
        html += '<div class="card-header bg-secondary text-white"><strong>🔑 Información del Sistema</strong></div>';
        html += '<div class="card-body">';
        html += '<div class="row">';
        
        const systemFields = [
            { key: 'PKEYHOJAVIDA', label: '🔑 ID Hoja de Vida', icon: '🔑' },
            { key: 'PKEYASPIRANT', label: '🔑 ID Aspirante', icon: '🔑' },
            { key: 'createdAt', label: '📅 Fecha de Creación', icon: '📅', isDate: true },
            { key: 'updatedAt', label: '📅 Última Actualización', icon: '📅', isDate: true }
        ];

        systemFields.forEach(field => {
            let value = hoja[field.key] || 'N/A';
            const hasError = false;
            const colorClass = hasError ? 'text-danger fw-bold' : 'text-dark';
            const bgClass = hasError ? 'bg-danger bg-opacity-10' : '';

            if (field.isDate && value !== 'N/A') {
                value = this.formatearFecha(value);
            }

            html += `<div class="col-md-6 mb-2 p-2 ${bgClass}" style="border-radius: 5px;">`;
            html += `<strong class="text-muted">${field.label}:</strong><br>`;
            html += `<span class="${colorClass}" style="font-size: 1.1em; font-family: monospace;">${value}</span>`;
            html += `</div>`;
        });
        
        html += '</div></div></div>';
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
            }
        });
    }

}