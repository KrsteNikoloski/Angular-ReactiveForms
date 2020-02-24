import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

import { Customer } from './customer';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent implements OnInit {
  customerForm: FormGroup;
  customer = new Customer();
  oldValues: {};
  validationMessages = {};

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

  ngOnInit() {
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
      sendCatalog: true
    });

    this.customerForm.get('notification').valueChanges.subscribe(
      value => this.setNotification(value)
    );

    this.oldValues = { ...this.customerForm.value };
    this.customerForm.valueChanges.pipe(
      debounceTime(100)
    ).subscribe(value => {
      const key = getChangePropertyName(this.oldValues, value);
      this.oldValues = { ...this.customerForm.value };
      this.setMessage(key);
    });
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
