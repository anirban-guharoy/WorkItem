import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FigmaPoCComponent } from './-figma-po-c.component';

describe('FigmaPoCComponent', () => {
  let component: FigmaPoCComponent;
  let fixture: ComponentFixture<FigmaPoCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FigmaPoCComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FigmaPoCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('FigmaPoC');
  });
});
