import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoginService } from './login.service';
import { AuthService } from '../../core/auth.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  loginData = {
    email: '',
    password: '',
    errorMessage: ''
  }

  // Propiedades para el efecto de seguimiento del mouse
  imageTransform = 'translate(-50%, -50%)';
  private mouseX = 0;
  private mouseY = 0;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private authService: AuthService
  ) { }

  private extractApiErrorMessage(err: any): string {
    try {
      if (err?.error) {
        const e = err.error;
        if (typeof e === 'string') return e;
        if (e?.response?.mensaje) return e.response.mensaje;
        if (e?.mensaje) return e.mensaje;
        if (e?.message) return e.message;
      }
      return err?.message ?? 'Ocurrió un error';
    } catch {
      return 'Ocurrió un error';
    }
  }

  login() {

    if (!this.loginData.email || !this.loginData.password) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor, complete todos los campos'
      });
      return;
    }

    const credentials = { email: this.loginData.email, password: this.loginData.password };

    this.loginService.loginService(credentials).subscribe({
      next: (res: any) => {
        if (res?.error === 1) {
          const msg = res?.response?.mensaje ?? 'Credenciales inválidas';
          this.loginData.errorMessage = msg;
          localStorage.setItem('token', '');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg
          });
          return;
        }

        this.loginData.errorMessage = '';
        localStorage.setItem('token', res.response.token);

        const user = {
          id: res.response.id,
          ips_id: res.response.ips_id,
          perfil: res.response.perfil,
          empresa: res.response.empresa,
          nombre: res.response.nombre,
          apellido: res.response.apellido,
          correo: res.response.correo,
          cel: res.response.cel,
          permiso: res.response.permiso
        };
        localStorage.setItem('user', JSON.stringify(user));

        // Establecer estado de autenticación
        this.authService.setAuthStatus(true);

        this.router.navigate(['home']);
      },
      error: (err: any) => {
        const msg = this.extractApiErrorMessage(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg
        });
      }
    });
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
}
