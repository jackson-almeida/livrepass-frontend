import { Component, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PasswordModule } from 'primeng/password';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  imports: [
    PasswordModule,
    ReactiveFormsModule
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error.set('Token inválido ou não fornecido.');
    }
  }

  passwordMatchValidator = (form: FormGroup) => {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword) {
      if (password.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        confirmPassword.setErrors(null);
      }
    }
    return null;
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid || !this.token) {
      Object.keys(this.resetPasswordForm.controls).forEach(key => {
        this.resetPasswordForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const payload = {
      token: this.token,
      newPassword: this.resetPasswordForm.value.newPassword
    };

    this.http.post<{ message: string }>('http://localhost:3000/api/auth/reset-password', payload)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Erro ao resetar senha.');
        }
      });
  }

  getErrorMessage(field: string): string {
    const control = this.resetPasswordForm.get(field);
    if (control?.hasError('required')) {
      return 'Este campo é obrigatório';
    }
    if (control?.hasError('minlength')) {
      return 'A senha deve ter no mínimo 6 caracteres';
    }
    if (control?.hasError('passwordMismatch')) {
      return 'As senhas não coincidem';
    }
    return '';
  }
}
