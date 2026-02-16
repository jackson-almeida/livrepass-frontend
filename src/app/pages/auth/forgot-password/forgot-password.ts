import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  imports: [
    RouterLink,
    InputTextModule,
    ReactiveFormsModule
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      Object.keys(this.forgotPasswordForm.controls).forEach(key => {
        this.forgotPasswordForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const payload = {
      email: this.forgotPasswordForm.value.email
    };

    this.http.post<{ message: string }>('http://localhost:3000/api/auth/forgot-password', payload)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Erro ao solicitar reset de senha.');
        }
      });
  }

  getErrorMessage(field: string): string {
    const control = this.forgotPasswordForm.get(field);
    if (control?.hasError('required')) {
      return 'Este campo é obrigatório';
    }
    if (control?.hasError('email')) {
      return 'Email inválido';
    }
    return '';
  }
}
