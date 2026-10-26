import { PublicApiMethod } from '../../../core-impl/PublicApi';
import { enumDefaultSetter, enumKeysSetter } from '../../../utils/enumDefaultSetter';
import { numberParser } from '../../../utils/numberParser';
import { stringParser } from '../../../utils/stringParser';
import { BaseElementImpl } from '../../BaseElement';
import { WidthEnum } from '../../BaseElement/BaseConstants';
import { withTooltip } from '../../Tooltip';
import { ElementsTypes } from '../ElementsTypes';
import { Icon } from '../PropertyConstants';
import {
	SizeProps,
	VariantProps,
	ColorProps,
	PositionProps,
	ButtonBadgeExtendedColorProps,
	type ButtonBadgeModel,
	ButtonBadgeColorProps,
} from './ButtonConstants';
import { type ButtonModel } from './ButtonModel';
import { type ButtonProps } from './ButtonProps';

const createBadge = ({ value = 0, color = 'default', white }: any): ButtonBadgeModel => {
	const isExpendedColor = !!Object.keys(ButtonBadgeExtendedColorProps).find(
		(type) => color === ButtonBadgeExtendedColorProps[type]
	);
	if (isExpendedColor) {
		return {
			value: numberParser(value),
			expandedColor: enumDefaultSetter(ButtonBadgeExtendedColorProps, color, undefined),
			white: !!white,
		};
	}
	return {
		value: numberParser(value),
		color: enumKeysSetter(ButtonBadgeColorProps, color, ButtonBadgeColorProps.default),
		white: !!white,
	};
};

@withTooltip()
export class ButtonElement extends BaseElementImpl<ButtonProps, ButtonModel> {
	static defaultProps: ButtonProps = {
		type: ElementsTypes.BUTTON,
		label: '',
		disabled: false,
		variant: VariantProps.contained,
		color: ColorProps.primary,
		icon: null,
		isProgress: false,
		size: SizeProps.medium,
		width: WidthEnum.wrap_content,
		iconPosition: PositionProps.left,
		badge: null,
	};

	protected _props: ButtonProps;

	constructor({ template, delegate }) {
		super({ template: { ...ButtonElement.defaultProps, ...template }, delegate });
		this._props = {
			...ButtonElement.defaultProps,
			...this._props,
			type: ElementsTypes.BUTTON,
		};
	}

	@PublicApiMethod()
	setProgress(value: boolean): void {
		this.setInnerAttribute('isProgress', value);
		this.setAttribute('disabled', value);
	}

	@PublicApiMethod()
	isProgress(): boolean {
		return this.getAttribute('isProgress');
	}

	render(): ButtonModel {
		const model = super.render() as ButtonModel;
		model.label = stringParser(this._props.label, ButtonElement.defaultProps.label);
		model.disabled = !!this._props.disabled;
		model.variant = enumDefaultSetter(VariantProps, this._props.variant, ButtonElement.defaultProps.variant);
		model.color = enumDefaultSetter(ColorProps, this._props.color, ButtonElement.defaultProps.color);
		model.icon = enumDefaultSetter(Icon, this._props.icon, ButtonElement.defaultProps.icon);
		model.isProgress = !!this._props.isProgress;
		model.size = enumDefaultSetter(SizeProps, this._props.size, ButtonElement.defaultProps.size);
		model.iconPosition = enumDefaultSetter(
			PositionProps,
			this._props.iconPosition,
			ButtonElement.defaultProps.iconPosition
		);
		model.badge = this._props.badge && createBadge(this._props.badge);
		return model;
	}
}
