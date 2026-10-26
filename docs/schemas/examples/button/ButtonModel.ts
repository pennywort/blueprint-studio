import { type BaseModel } from '../../BaseElement';
import {
	type VariantModel,
	type SizeModel,
	type ColorModel,
	type PositionModel,
	type ButtonBadgeModel,
} from './ButtonConstants';

export interface ButtonModel extends BaseModel {
	label: string;
	disabled: boolean;
	variant: VariantModel;
	color: ColorModel;
	icon: string | null;
	isProgress: boolean;
	size: SizeModel;
	iconPosition: PositionModel;
	badge: ButtonBadgeModel;
}

export type ButtonSizeModel = SizeModel;
