import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, ButtonModule],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss'
})
export class AppLayoutComponent {
  themeService = inject(ThemeService);

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
