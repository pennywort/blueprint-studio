import { type FormFieldModel } from '../../FormFieldElement';
import { type ElementsTypes } from '../ElementsTypes';
import { type ModeModel } from './DatePickerConstants';

export interface DatePickerModel extends FormFieldModel {
	type: ElementsTypes.DATE_FIELD;
	label: string;
	mode: ModeModel;
	disabled: boolean;
	required: boolean;
	placeholder: string;
	error: string;
	value: Date;
	minDate: Date | null;
	maxDate: Date | null;
	disabledDates: Array<Date>;
	disabledKeyboard: boolean;
}
