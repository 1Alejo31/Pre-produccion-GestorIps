import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-aspirante',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './aspirante.html',
  styleUrl: './aspirante.css'
})
export class Aspirante implements OnDestroy {

  aspiranteData = {
    numeroDocumento: '',
    codigoInscripcion: '',
    errorMessage: ''
  }

  // Propiedades para el modal y datos del aspirante
  showModal = false;
  aspiranteInfo: any = null;
  loading = false;

  // Propiedades para el manejo de archivos de consentimiento
  consentimientoFile: File | null = null;
  consentimientoPreview: SafeResourceUrl | null = null;
  uploadingConsentimiento = false;
  mostrarPrevisualizacion = false;

  // Propiedades para visualización de PDF existente
  pdfExistenteUrl: SafeResourceUrl | null = null;
  mostrarPdfExistente = false;
  loadingPdfExistente = false;

  // Propiedades para el efecto de seguimiento del mouse
  imageTransform = 'translate(-50%, -50%)';
  private mouseX = 0;
  private mouseY = 0;

  constructor(
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) { }

  ngOnDestroy(): void {
    // Limpiar blob URLs al destruir el componente para prevenir memory leaks
    if (this.consentimientoPreview) {
      const url = this.consentimientoPreview.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    if (this.pdfExistenteUrl) {
      const url = this.pdfExistenteUrl.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
  }

  buscarAspirante() {
    
    if (!this.aspiranteData.numeroDocumento || !this.aspiranteData.codigoInscripcion) {
      this.aspiranteData.errorMessage = !this.aspiranteData.numeroDocumento
        ? 'Por favor, ingrese el número de documento'
        : 'Por favor, ingrese el código de inscripción';
      return;
    }

    // Validación básica de número de documento (solo números y longitud mínima)
    const documentoRegex = /^[0-9]{6,12}$/;
    if (!documentoRegex.test(this.aspiranteData.numeroDocumento)) {
      this.aspiranteData.errorMessage = 'Por favor, ingrese un número de documento válido (6-12 dígitos)';
      return;
    }

    // Limpiar mensaje de error
    this.aspiranteData.errorMessage = '';
    this.loading = true;

    // Consumir el servicio
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = {
      documento: this.aspiranteData.numeroDocumento,
      codigo_inscripcion: this.aspiranteData.codigoInscripcion
    };

    this.http.post<any>('http://3.142.186.227:3000/api/hojas-vida/por_documento', body, { headers })
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.error === 0 && response.response?.data) {
            this.aspiranteInfo = response.response.data;
            this.showModal = true;
          } else {
            this.aspiranteData.errorMessage = '';
            Swal.fire({
              icon: 'warning',
              title: 'No se encontró aspirante',
              text: 'Verifique el documento y el código de inscripción'
            });
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al buscar aspirante:', error);
          this.aspiranteData.errorMessage = '';
          Swal.fire({
            icon: 'error',
            title: 'No se encontró aspirante',
            text: 'Por favor, verifique los datos e intente nuevamente.'
          });
        }
      });
  }

  limpiarFormulario() {
    this.aspiranteData = {
      numeroDocumento: '',
      codigoInscripcion: '',
      errorMessage: ''
    };
  }

  cerrarModal() {
    this.showModal = false;
    this.aspiranteInfo = null;
    // Limpiar el blob URL del consentimiento si existe
    if (this.consentimientoPreview) {
      const url = this.consentimientoPreview.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    // Limpiar el blob URL del PDF existente si existe
    if (this.pdfExistenteUrl) {
      const url = this.pdfExistenteUrl.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    this.consentimientoFile = null;
    this.consentimientoPreview = null;
    this.mostrarPrevisualizacion = false;
    this.pdfExistenteUrl = null;
    this.mostrarPdfExistente = false;
  }

  // Método para formatear fecha de Excel (número serial)
  formatearFechaExcel(serial: number): string {
    if (!serial) return 'N/A';
    // Excel base date is January 1, 1900
    const excelBaseDate = new Date(1900, 0, 1);
    const date = new Date(excelBaseDate.getTime() + (serial - 2) * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('es-CO');
  }

  // Método para obtener los datos organizados para la línea de tiempo
  getTimelineData() {
    if (!this.aspiranteInfo) return [];
    
    return [
      {
        title: 'Información Personal',
        items: [
          { label: 'Nombre Completo', value: `${this.aspiranteInfo.NOMBRE} ${this.aspiranteInfo.PRIMER_APELLIDO} ${this.aspiranteInfo.SEGUNDO_APELLIDO || ''}`.trim() },
          { label: 'Documento', value: this.aspiranteInfo.DOCUMENTO },
          { label: 'Edad', value: `${this.aspiranteInfo.EDAD} años` },
          { label: 'Género', value: this.aspiranteInfo.GENERO === 'M' ? 'Masculino' : 'Femenino' },
          { label: 'Fecha de Nacimiento', value: this.formatearFechaExcel(this.aspiranteInfo.FECH_NACIMIENTO) }
        ]
      },
      {
        title: 'Información de Contacto',
        items: [
          { label: 'Correo Electrónico', value: this.aspiranteInfo.CORREO },
          { label: 'Teléfono', value: this.aspiranteInfo.TELEFONO },
          { label: 'Celular', value: this.aspiranteInfo.CELULAR },
          { label: 'Dirección', value: this.aspiranteInfo.DIRECCION },
          { label: 'Ciudad', value: this.aspiranteInfo.CIUDAD },
          { label: 'Departamento', value: this.aspiranteInfo.DEPARTAMENTO }
        ]
      },
      {
        title: 'Información Académica',
        items: [
          { label: 'Código de Inscripción', value: this.aspiranteInfo.CODIGO_INSCRIPCION },
          { label: 'Año Período Académico', value: `${this.aspiranteInfo.ANNOPERIACAD} - Período ${this.aspiranteInfo.NUMEPERIACAD}` },
          { label: 'Colegio', value: this.aspiranteInfo.COLEGIO },
          { label: 'Estrato', value: `Estrato ${this.aspiranteInfo.ESTRATO}` },
          { label: 'Fecha de Inscripción', value: this.formatearFechaExcel(this.aspiranteInfo.FECHA_INSCRIPCION) },
          { label: 'Tipo de Medio', value: this.aspiranteInfo.TIPO_MEDIO }
        ]
      },
      {
        title: 'Estado y Gestión',
        items: [
          { label: 'ID del Caso', value: this.aspiranteInfo._id || this.aspiranteInfo.ID || this.aspiranteInfo.id_caso || 'No disponible' },
          { label: 'Estado', value: this.aspiranteInfo.ESTADO },
          { label: 'Estado de Notificación', value: this.aspiranteInfo.ESTADO_NOTIFICACION },
          { label: 'Regional', value: this.aspiranteInfo.REGIONAL },
          { label: 'Archivo PDF', value: this.obtenerNombrePdfExistente() || 'No disponible' }
        ]
      }
    ];
  }

  // Método para manejar el movimiento del mouse
  onMouseMove(event: MouseEvent): void {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    // Calcular la posición relativa del mouse
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
    
    // Calcular el desplazamiento basado en la posición del mouse
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Crear un efecto de parallax suave (movimiento reducido)
    const moveX = (this.mouseX - centerX) * 0.05; // Factor de 0.05 para movimiento sutil
    const moveY = (this.mouseY - centerY) * 0.05;
    
    // Actualizar la transformación de la imagen
    this.imageTransform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  }

  // Métodos para manejar el consentimiento
  mostrarCampoConsentimiento(): boolean {
    return this.aspiranteInfo && this.aspiranteInfo.ESTADO === 'Notificado Consentimiento';
  }

  // Método para verificar si hay un PDF existente para visualizar
  tienePdfExistente(): boolean {
    if (!this.aspiranteInfo) return false;
    
    // Buscar campos que puedan contener el nombre del PDF
    const camposPdf = ['PDF', 'pdf', 'pdf_nombre', 'PDF_NOMBRE', 'archivo_pdf', 'ARCHIVO_PDF', 'consentimiento_pdf'];
    
    for (const campo of camposPdf) {
      if (this.aspiranteInfo[campo]) {
        return true;
      }
    }
    
    return false;
  }

  // Método para obtener el nombre del PDF existente
  obtenerNombrePdfExistente(): string {
    if (!this.aspiranteInfo) return '';
    
    // Buscar campos que puedan contener el nombre del PDF o la ruta completa
    const camposPdf = [
      'PDF', 'pdf', 'pdf_nombre', 'PDF_NOMBRE', 'archivo_pdf', 'ARCHIVO_PDF', 
      'consentimiento_pdf', 'CONSENTIMIENTO_PDF', 'ruta_pdf', 'RUTA_PDF',
      'notificacion_pdf', 'NOTIFICACION_PDF', 'file_name', 'FILE_NAME'
    ];
    
    for (const campo of camposPdf) {
      if (this.aspiranteInfo[campo]) {
        let valor = this.aspiranteInfo[campo];
        console.log(`Campo ${campo} encontrado:`, valor);
        
        // Limpiar el valor de espacios en blanco
        valor = valor.trim();
        
        // Si el valor contiene una ruta completa, extraer solo el nombre del archivo
        if (valor.includes('/')) {
          // Eliminar cualquier parte de la ruta que contenga 'notificaciones', 'api', 'pdf', etc.
          valor = valor.replace(/^.*[\/\\]/, ''); // Eliminar todo antes del último / o \
        }
        
        // Asegurar que solo tengamos el nombre del archivo
        valor = valor.replace(/^.*[\/\\]/, '');
        
        console.log(`Nombre del archivo limpio:`, valor);
        return valor;
      }
    }
    
    return '';
  }

  // Método para visualizar el PDF existente
  visualizarPdfExistente(): void {
    const nombrePdf = this.obtenerNombrePdfExistente();
    console.log('Nombre del PDF a visualizar:', nombrePdf);
    
    if (!nombrePdf) {
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: 'No se encontró un PDF para visualizar'
      });
      return;
    }

    this.loadingPdfExistente = true;
    this.mostrarPdfExistente = true;

    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ 
      'Authorization': `Bearer ${token}`
    });

    // Asegurar que el nombre del PDF no tenga rutas adicionales
    let nombrePdfLimpio = nombrePdf;
    if (nombrePdfLimpio.includes('/')) {
      const partes = nombrePdfLimpio.split('/');
      nombrePdfLimpio = partes[partes.length - 1];
    }
    
    // Construir la URL correcta sin duplicación de rutas
    const urlBase = 'http://3.142.186.227:3000/api/pdf/recibida/';
    const urlCompleta = urlBase + nombrePdfLimpio;
    
    console.log('URL completa del servicio:', urlCompleta);

    // Consumir el servicio para obtener el PDF
    this.http.get(urlCompleta, { 
      headers, 
      responseType: 'blob' 
    })
    .subscribe({
      next: (pdfBlob: Blob) => {
        this.loadingPdfExistente = false;
        
        // Crear URL del blob y sanitizarla
        const blobUrl = URL.createObjectURL(pdfBlob);
        this.pdfExistenteUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
        
        // Mostrar el PDF en un modal de SweetAlert2
        const html = `
          <div class="pdf-viewer-modal">
            <embed src="${blobUrl}" type="application/pdf" class="pdf-embed">
          </div>
        `;

        Swal.fire({
          title: 'Visualizador de PDF',
          html,
          width: '80%',
          heightAuto: false,
          showCloseButton: true,
          showConfirmButton: false,
          customClass: {
            container: 'pdf-viewer-container',
            htmlContainer: 'pdf-viewer-html-container'
          },
          didClose: () => {
            // Limpiar el blob URL cuando se cierre el modal
            if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
            }
            this.pdfExistenteUrl = null;
            this.mostrarPdfExistente = false;
          }
        });
      },
      error: (error) => {
        this.loadingPdfExistente = false;
        console.error('Error al obtener PDF:', error);
        
        let errorMessage = 'Error al cargar el PDF. Por favor, intente nuevamente.';
        if (error.status === 401) {
          errorMessage = 'Token requerido. Por favor, inicie sesión nuevamente.';
        } else if (error.status === 404) {
          errorMessage = 'El archivo PDF no fue encontrado en el servidor.';
        }

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage
        });
        
        this.mostrarPdfExistente = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar que sea un archivo PDF
      if (file.type !== 'application/pdf') {
        alert('Por favor, seleccione un archivo PDF válido');
        event.target.value = '';
        return;
      }
      
      this.consentimientoFile = file;
      this.crearPrevisualizacion(file);
    }
  }

  crearPrevisualizacion(file: File): void {
    // Crear un blob URL en lugar de data URL para mejor compatibilidad
    const blob = new Blob([file], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    this.consentimientoPreview = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  subirConsentimiento(): void {
    if (!this.consentimientoFile) {
      return;
    }

    // Obtener el ID del caso del aspirante
    const idCaso = this.aspiranteInfo._id || this.aspiranteInfo.ID || this.aspiranteInfo.id_caso;
    if (!idCaso) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del caso para este aspirante'
      });
      return;
    }

    this.uploadingConsentimiento = true;
    
    const formData = new FormData();
    formData.append('_id', idCaso.toString());
    formData.append('pdf', this.consentimientoFile, this.consentimientoFile.name);

    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ 
      'Authorization': `Bearer ${token}`
    });

    // Consumir el servicio de notificación recibida
    this.http.put<any>('http://3.142.186.227:3000/api/hojas-vida/notificacion/recibida', formData, { headers })
      .subscribe({
        next: (response) => {
          this.uploadingConsentimiento = false;
          if (response.error === 0) {
            // Mostrar mensaje de éxito con SweetAlert2
            Swal.fire({
              icon: 'success',
              title: 'Éxito',
              text: 'Consentimiento subido exitosamente',
              confirmButtonText: 'Aceptar'
            }).then((result) => {
              // Refrescar la página después de que el usuario cierre el mensaje
              if (result.isConfirmed) {
                window.location.reload();
              }
            });
            
            // Limpiar el formulario
            this.consentimientoFile = null;
            this.consentimientoPreview = null;
            this.mostrarPrevisualizacion = false;
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error al subir el consentimiento: ' + (response.message || 'Error desconocido')
            });
          }
        },
        error: (error) => {
          this.uploadingConsentimiento = false;
          console.error('Error al subir consentimiento:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al subir el consentimiento. Por favor, intente nuevamente.'
          });
        }
      });
  }

  eliminarArchivo(): void {
    // Limpiar el blob URL anterior si existe
    if (this.consentimientoPreview) {
      const url = this.consentimientoPreview.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    this.consentimientoFile = null;
    this.consentimientoPreview = null;
    this.mostrarPrevisualizacion = false;
  }

  previsualizarArchivo(): void {
    if (this.consentimientoPreview && this.consentimientoFile) {
      this.mostrarPrevisualizacion = !this.mostrarPrevisualizacion;
    }
  }
}
