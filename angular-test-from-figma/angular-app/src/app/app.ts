import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FigmaTestComponent } from './figma-test/figma-test.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FigmaTestComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('angular-app');
}
