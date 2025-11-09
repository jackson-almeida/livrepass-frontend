import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-ingressos',
  imports: [CardModule, ButtonModule],
  templateUrl: './ingressos.html',
  styleUrl: './ingressos.scss'
})
export class IngressosComponent {}
