import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RegisterService } from '../../admin/registroUsuarios/registro.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-registro-usuarios',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './registro-usuarios.html',
    styleUrls: ['./registro-usuarios.css']
})
export class RegistroUsuarios implements OnInit {
    form: FormGroup;
    submitted = false;
    cargandoIps = false;

    tiposDocumento = ['CC', 'CE', 'TI', 'PA'];
    perfiles = ['Administrador', 'Supervisor', 'Usuario', 'Cliente'];
    estados = ['Activo', 'Inactivo', 'Suspendido'];
    ips: any[] = [];

    departamentos = ['Cundinamarca', 'Antioquia', 'Valle del Cauca', 'Santander'];
    ciudades = ['Bogotá', 'Medellín', 'Cali', 'Bucaramanga'];

    constructor(private fb: FormBuilder, private registerService: RegisterService) {
        this.form = this.fb.group({

            peNombre: ['', [Validators.required, Validators.maxLength(50)]],
            peApellido: ['', [Validators.required, Validators.maxLength(50)]],
            peSegApellido: ['', [Validators.maxLength(50)]],
            peTipoDocumento: ['CC', [Validators.required]],
            peDocumento: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9\-\.]+$/)]],
            peTelefonoFijo: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
            peCel: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
            peCorreo: ['', [Validators.required, Validators.email]],
            peDireccion: ['', [Validators.required, Validators.maxLength(120)]],
            pePermiso: ['Lectura y Escritura', [Validators.required]],
            peDepartamento: ['', [Validators.required]],
            peCiudad: ['', [Validators.required]],

            crNombreUsuario: ['', [Validators.required, Validators.email]],
            crPassword: ['', [Validators.required]],
            crPerfil: ['Administrador', [Validators.required]],
            crEmpresa: ['', [Validators.required]]
        });

        this.form.get('peCorreo')?.valueChanges.subscribe(val => {
            this.form.get('crNombreUsuario')?.setValue(val ?? '', { emitEvent: false });
        });

        this.form.get('peDocumento')?.valueChanges.subscribe(val => {
            this.form.get('crPassword')?.setValue(val ?? '', { emitEvent: false });
        });
    }

    ngOnInit(): void {
        this.cargarIps();
    }

    cargarIps(): void {
        this.registerService.consultarIps().subscribe({
            next: (response) => {
                if (response?.error === 0 && response?.response?.ips) {
                    this.ips = response.response.ips;
                } else {
                    console.error('Error al cargar IPS:', response?.response?.mensaje);
                    Swal.fire({
                        icon: 'warning',
                        title: 'Advertencia',
                        text: 'No se pudieron cargar las IPS disponibles'
                    });
                }
            },
            error: (error) => {
                console.error('Error al consultar IPS:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al cargar las IPS disponibles'
                });
            }
        });
    }

    get f() { return this.form.controls; }

    submit(): void {
        this.submitted = true;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const persona = {
            Pe_Nombre: this.f['peNombre'].value,
            Pe_Apellido: this.f['peApellido'].value,
            Pe_Seg_Apellido: this.f['peSegApellido'].value,
            Pe_Tipo_Documento: this.f['peTipoDocumento'].value,
            Pe_Documento: this.f['peDocumento'].value,
            Pe_Telefons_Fijo: this.f['peTelefonoFijo'].value,
            Pe_Cel: this.f['peCel'].value,
            Pe_Correo: this.f['peCorreo'].value,
            Pe_Direccion: this.f['peDireccion'].value,
            Pe_Permiso: this.f['pePermiso'].value,
            Pe_Departamento: this.f['peDepartamento'].value,
            Pe_Ciudad: this.f['peCiudad'].value
        };

        const credenciales = {
            Cr_Nombre_Usuario: this.f['crNombreUsuario'].value,
            Cr_Password: this.f['crPassword'].value,
            Cr_Perfil: this.f['crPerfil'].value,
            Cr_Empresa: this.f['crEmpresa'].value
        };


        this.registerService.register({ persona, credenciales }).subscribe({
            next: (res) => {
                if (res?.error === 1) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: res?.response?.mensaje ?? 'Error al registrar'
                    });
                    return;
                }

                if (res?.error === 0) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: res?.response?.mensaje ?? 'Registro exitoso'
                    });
                    this.form.reset();
                    return;
                }
            },
            error: (err) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err?.error?.response?.mensaje ?? 'Error al registrar'
                });
            }
        });
    }
}