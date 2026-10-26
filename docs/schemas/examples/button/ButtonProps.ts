import { type BaseProps } from '../../BaseElement';
import { type Icon } from '../PropertyConstants';
import {
	type SizeProps,
	type VariantProps,
	type ColorProps,
	type PositionProps,
	type ButtonBadgeModel,
} from './ButtonConstants';

export interface ButtonProps extends BaseProps {
	label?: string;
	disabled?: boolean;
	variant?: VariantProps;
	color?: ColorProps;
	icon?: Icon | null;
	isProgress?: boolean;
	size?: SizeProps;
	iconPosition?: PositionProps;
	badge?: ButtonBadgeModel;
}
