import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'theme';
  public isDarkMode = signal<boolean>(false);

  constructor() {
    // Carregar tema salvo ou usar preferência do sistema
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    if (savedTheme) {
      this.isDarkMode.set(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
    }

    // Aplicar tema inicial
    this.applyTheme();

    // Effect para aplicar tema quando mudar
    effect(() => {
      this.applyTheme();
    });
  }

  toggleTheme() {
    this.isDarkMode.update(dark => !dark);
  }

  private applyTheme() {
    const isDark = this.isDarkMode();

    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(this.THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(this.THEME_KEY, 'light');
    }
  }
}
