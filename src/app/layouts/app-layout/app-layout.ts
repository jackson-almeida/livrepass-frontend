import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, ButtonModule, MenuModule],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss'
})
export class AppLayoutComponent implements OnInit {
  themeService = inject(ThemeService);
  router = inject(Router);

  userName = signal<string>('Usuário');
  userMenuItems = signal<MenuItem[]>([]);
  isLoggedIn = signal<boolean>(false);

  ngOnInit() {
    this.loadUserData();
    this.setupUserMenu();
  }

  loadUserData() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const firstName = user.name?.split(' ')[0] || 'Usuário';
        this.userName.set(firstName);
        this.isLoggedIn.set(true);
      } catch (e) {
        console.error('Error parsing user data', e);
        this.isLoggedIn.set(false);
      }
    } else {
      this.isLoggedIn.set(false);
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn.set(false);
    this.router.navigate(['/auth/login']);
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
