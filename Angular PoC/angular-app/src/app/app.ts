import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FigmaPoCComponent } from './figma-poc/figma-poc.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FigmaPoCComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('angular-app');
}
