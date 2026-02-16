import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { MessageComponent } from '../../components/message/message.component';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { UserPurchasesService } from '../../services/user-purchases.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NavbarComponent, MessageComponent],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss'
})
export class AppLayoutComponent {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  private router = inject(Router);
  private purchasesService = inject(UserPurchasesService);

  isLoggedIn = this.authService.isLoggedIn;
  pendingPurchasesCount = computed(() => this.purchasesService.pendingPurchases().length);

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
  }

  onTabClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
