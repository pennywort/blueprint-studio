export enum VariantProps {
	text = 'text',
	contained = 'contained',
}

export type VariantModel = `${(typeof VariantProps)[keyof typeof VariantProps]}`;

export enum SizeProps {
	small = 'small',
	medium = 'medium',
	large = 'large',
}

export type SizeModel = `${(typeof SizeProps)[keyof typeof SizeProps]}`;

export enum ColorProps {
	default = 'default',
	primary = 'primary',
	inversePrimary = 'inversePrimary',
	inverseDefault = 'inverseDefault',
	white = 'white',
	secondary = 'secondary',
}

export type ColorModel = `${(typeof ColorProps)[keyof typeof ColorProps]}`;

export enum PositionProps {
	left = 'left',
	right = 'right',
}

export type PositionModel = `${(typeof PositionProps)[keyof typeof PositionProps]}`;

export enum ButtonBadgeColorProps {
	default = 'default',
	error = 'error',
	primary = 'primary',
	info = 'secondary',
}

export type ButtonBadgeColorModel = `${(typeof ButtonBadgeColorProps)[keyof typeof ButtonBadgeColorProps]}`;

export enum ButtonBadgeExtendedColorProps {
	warning = 'warning',
	error = 'error',
	success = 'success',
	green = 'green',
	blue = 'blue',
	orange = 'orange',
	yellow = 'yellow',
	purple = 'purple',
	pink = 'pink',
	red = 'red',
	infoSecondary = 'infoSecondary',
	infoTertiary = 'infoTertiary',
	purple2 = 'purple2',
	pink2 = 'pink2',
	grey = 'grey',
	lime = 'lime',
	yellow2 = 'yellow2',
	defaultOutline = 'defaultOutline',
	secondary = 'secondary',
}

export type ButtonBadgeExtendedColorModel =
	`${(typeof ButtonBadgeExtendedColorProps)[keyof typeof ButtonBadgeExtendedColorProps]}`;

export type ButtonBadgeModel = {
	value: number;
	color?: ButtonBadgeColorModel;
	expandedColor?: ButtonBadgeExtendedColorProps;
	white?: boolean;
};
