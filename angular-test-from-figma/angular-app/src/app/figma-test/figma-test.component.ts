import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-figma-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './figma-test.component.html',
  styleUrls: ['./figma-test.component.css']
})
export class FigmaTestComponent {
  title = 'FigmaTest';
  
  // Add your component logic here
  constructor() {}
  
  ngOnInit(): void {
    // Initialize component
  }
}
