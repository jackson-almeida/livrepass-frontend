import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, AuthUser } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    RouterLink,
    InputTextModule,
    PasswordModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  private returnUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const payload = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.http.post<{
      message: string;
      user: AuthUser;
      token: string;
    }>('http://localhost:3000/api/auth/login', payload)
      .subscribe({
        next: (response) => {
          this.authService.setAuth(response.token, response.user);
          this.loading.set(false);
          // Redirect to returnUrl if available, otherwise to /ingressos
          const redirectTo = this.returnUrl || '/ingressos';
          this.router.navigateByUrl(redirectTo);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Erro ao fazer login. Verifique suas credenciais.');
        }
      });
  }

  getErrorMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (control?.hasError('required')) {
      return 'Este campo é obrigatório';
    }
    if (control?.hasError('email')) {
      return 'Email inválido';
    }
    if (control?.hasError('minlength')) {
      return 'A senha deve ter no mínimo 6 caracteres';
    }
    return '';
  }
}
