import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-register',
  imports: [RouterLink, ButtonModule, InputTextModule, PasswordModule, CardModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {}
