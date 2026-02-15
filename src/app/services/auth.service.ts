import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    phone?: string;
    cpf?: string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly TOKEN_KEY = 'token';
    private readonly USER_KEY = 'user';

    private _user = signal<AuthUser | null>(this.loadUser());
    private _token = signal<string | null>(this.loadToken());

    user = this._user.asReadonly();
    token = this._token.asReadonly();
    isLoggedIn = computed(() => !!this._token() && !!this._user());

    constructor(private readonly router: Router) { }

    getToken(): string | null {
        return this._token();
    }

    getUser(): AuthUser | null {
        return this._user();
    }

    setAuth(token: string, user: AuthUser): void {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this._token.set(token);
        this._user.set(user);
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this._token.set(null);
        this._user.set(null);
        this.router.navigate(['/auth/login']);
    }

    /**
     * Redireciona para o login se não estiver autenticado, passando o returnUrl.
     */
    requireAuth(returnUrl?: string): boolean {
        if (this.isLoggedIn()) {
            return true;
        }
        this.router.navigate(['/auth/login'], {
            queryParams: returnUrl ? { returnUrl } : {},
        });
        return false;
    }

    private loadUser(): AuthUser | null {
        try {
            const data = localStorage.getItem(this.USER_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    private loadToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }
}
