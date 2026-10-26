import { dateParser } from '../../../utils/dateParser';
import { enumDefaultSetter } from '../../../utils/enumDefaultSetter';
import { stringParser } from '../../../utils/stringParser';
import { FormFieldElement } from '../../FormFieldElement';
import { ElementsTypes } from '../ElementsTypes';
import { ModeProp } from './DatePickerConstants';
import { type DatePickerModel } from './DatePickerModel';
import { type DatePickerProps } from './DatePickerProps';

export class DatePickerElement extends FormFieldElement {
	static defaultProps: DatePickerProps = {
		type: ElementsTypes.DATE_FIELD,
		label: '',
		mode: ModeProp.datetime,
		disabled: false,
		required: false,
		placeholder: '',
		error: '',
		value: null,
		minDate: null,
		maxDate: null,
		disabledDates: [],
		disabledKeyboard: false,
	};

	protected _props: DatePickerProps;

	constructor({ template, delegate }) {
		super({ template, delegate });
		this._props = {
			...DatePickerElement.defaultProps,
			...this._props,
		};
	}

	render() {
		const model = super.render() as DatePickerModel;
		model.label = this._props.label;
		model.value = dateParser(this._props.value, DatePickerElement.defaultProps.value);
		model.required = !!this._props.required;
		model.disabled = !!this._props.disabled;
		model.placeholder = stringParser(this._props.placeholder, DatePickerElement.defaultProps.placeholder);
		model.error = stringParser(this._props.error, DatePickerElement.defaultProps.error);
		model.mode = enumDefaultSetter(ModeProp, this._props.mode, ModeProp.datetime);
		model.minDate = dateParser(this._props.minDate, DatePickerElement.defaultProps.minDate);
		model.maxDate = dateParser(this._props.maxDate, DatePickerElement.defaultProps.maxDate);
		model.disabledDates = dateParser(this._props.disabledDates, DatePickerElement.defaultProps.disabledDates, true);
		model.disabledKeyboard = !!this._props.disabledKeyboard;
		return model;
	}
}
