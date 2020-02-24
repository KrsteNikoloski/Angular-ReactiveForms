import { Component, OnInit, ElementRef, ViewChildren, AfterViewInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidatorFn, FormArray, FormControlName } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

import { Customer } from './customer';
import { Observable, fromEvent, merge } from 'rxjs';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent implements OnInit, AfterViewInit {
  @ViewChildren(FormControlName, { read: ElementRef })
  formInputElements: ElementRef[];
  customerForm: FormGroup;
  customer = new Customer();
  oldValues: {};
  validationMessages = {};

  get addresses(): FormArray {
    return this.customerForm.get('addresses') as FormArray;
  }

  private messages = {
    'emailGroup.email': {
      required: 'Please enter your email address.',
      email: 'Please enter a valid email address.'
    },
    'emailGroup.confirmEmail': {
      required: 'Please enter your email address.'
    },
    emailGroup: {
      match: 'The emails don\'t match'
    }
  };

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(3)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      emailGroup: this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        confirmEmail: ['', Validators.required]
      }, { validator: valuesMatch(['email', 'confirmEmail']) }),
      phone: [''],
      notification: ['email'],
      rating: [null, ratingRange(1, 5)],
      sendCatalog: true,
      addresses: this.fb.array([this.buildAddress()])
    });
  }

  ngAfterViewInit(): void {
    const controlBlurs: Observable<any>[] = this.formInputElements
      .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));

    this.customerForm.get('notification').valueChanges.subscribe(
      value => this.setNotification(value)
    );

    merge(this.customerForm.valueChanges, ...controlBlurs).pipe(
      debounceTime(800)
    ).subscribe(value => {
      const key = getChangePropertyName(this.oldValues, value);
      this.oldValues = { ...this.customerForm.value };
      this.setMessage(key);
    });
  }

  buildAddress(): FormGroup {
    return this.fb.group({
      addressType: 'home',
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip: ''
    });
  }

  addAddress() {
    this.addresses.push(this.buildAddress());
  }

  save() {
    console.log(this.customerForm);
    console.log('Saved: ' + JSON.stringify(this.customerForm.value));
  }

  setNotification(type: string) {
    const phoneControl = this.customerForm.get('phone');

    if (type === 'text') {
      phoneControl.setValidators(Validators.required);
    } else {
      phoneControl.clearValidators();
    }

    phoneControl.updateValueAndValidity();
  }

  setMessage(controlName: string) {
    const control = this.customerForm.get(controlName);
    this.validationMessages[controlName] = '';

    if ((control.touched || control.dirty)) {
      if (control.errors) {
        this.validationMessages[controlName] = Object.keys(control.errors).map(
          key => this.messages[controlName][key]
        ).join(' ');
      }

      if (control.parent) {
        const parentName = getControlName(control.parent);
        this.validationMessages[parentName] = '';

        if (control.parent.errors) {
          this.validationMessages[parentName] = Object.keys(control.parent.errors).map(
            key => this.messages[parentName][key]
          ).join(' ');
        }
      }
    }
  }

  processMessages(container: FormGroup): { [key: string]: string } {
    const messages = {};

    for (const controlKey in container.controls) {
      if (container.controls.hasOwnProperty(controlKey)) {
        const c = container.controls[controlKey];

        if (c instanceof FormGroup) {
          const childMessages = this.processMessages(c);
          Object.assign(messages, childMessages);
        } else {
          if (this.validationMessages[controlKey]) {
            messages[controlKey] = '';

            if ((c.dirty || c.touched) && c.errors) {
              Object.keys(c.errors).map(messageKey => {

                if (this.validationMessages[controlKey][messageKey]) {
                  messages[controlKey] += this.validationMessages[controlKey][messageKey] + ' ';
                }
              });
            }
          }
        }
      }
    }

    return messages;
  }
}

function getChangePropertyName(oldValues: any, newValues: any): string {
  let key = Object.keys(newValues).find(k => newValues[k] !== oldValues[k]);

  if (newValues[key] instanceof Object) {
    key = key + '.' + getChangePropertyName(oldValues[key], newValues[key]);
  }

  return key;
}

function getControlName(c: AbstractControl): string | null {
  const siblings = c.parent.controls;
  let controlName = Object.keys(siblings).find(name => c === siblings[name]) || null;

  if (c.parent.parent) {
    controlName = getControlName(c.parent) + '.' + controlName;
  }

  return controlName;
}

function ratingRange(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): { [key: string]: { min: number, max: number } } | null => {
    if (control.value !== null
      && (isNaN(control.value) || control.value < min || control.value > max)) {
      return { range: { min, max } };
    }

    return null;
  };
}

function valuesMatch(controlNames: string[]): ValidatorFn {
  return (group: AbstractControl): { [key: string]: boolean } | null => {
    const controls = controlNames.map(name => group.get(name));

    if (controls.some(control => control.pristine)) {
      return null;
    }

    if (!controls.every(control => control.value === controls[0].value)) {
      return { match: true };
    }

    return null;
  };
}
