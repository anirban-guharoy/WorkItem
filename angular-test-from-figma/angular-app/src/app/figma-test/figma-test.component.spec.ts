import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FigmaTestComponent } from './figma-test.component';

describe('FigmaTestComponent', () => {
  let component: FigmaTestComponent;
  let fixture: ComponentFixture<FigmaTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FigmaTestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FigmaTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('FigmaTest');
  });
});
