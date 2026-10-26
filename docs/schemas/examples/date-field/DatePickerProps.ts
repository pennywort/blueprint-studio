import { type FormFieldProps } from '../../FormFieldElement';
import { type ElementsTypes } from '../ElementsTypes';
import { type ModeProp } from './DatePickerConstants';

export interface DatePickerProps extends FormFieldProps {
	type?: ElementsTypes.DATE_FIELD;
	label?: string;
	mode?: ModeProp;
	disabled?: boolean;
	required?: boolean;
	placeholder?: string;
	error?: string;
	value?: Date | string;
	minDate?: Date | null;
	maxDate?: Date | null;
	disabledDates?: Array<Date>;
	disabledKeyboard?: boolean;
}
