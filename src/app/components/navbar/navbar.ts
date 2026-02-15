import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, ButtonModule, MenuModule],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss'
})
export class NavbarComponent implements OnInit {
    themeService = inject(ThemeService);
    authService = inject(AuthService);
    router = inject(Router);

    userName = signal<string>('Usuário');
    userMenuItems = signal<MenuItem[]>([]);
    isLoggedIn = this.authService.isLoggedIn;

    ngOnInit() {
        this.loadUserData();
        this.setupUserMenu();
    }

    loadUserData() {
        const user = this.authService.getUser();
        if (user) {
            const firstName = user.name?.split(' ')[0] || 'Usuário';
            this.userName.set(firstName);
        }
    }

    setupUserMenu() {
        this.userMenuItems.set([
            {
                label: 'Sair',
                icon: 'pi pi-sign-out',
                command: () => this.logout()
            }
        ]);
    }

    logout() {
        this.authService.logout();
    }

    goToLogin() {
        this.router.navigate(['/auth/login']);
    }

    toggleTheme() {
        this.themeService.toggleTheme();
    }
}
