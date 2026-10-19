import { type ResourceService } from '../../../api/Resource';
import { enumDefaultSetter } from '../../../utils/enumDefaultSetter';
import { isObject } from '../../../utils/isObject';
import { stringParser } from '../../../utils/stringParser';
import { ContainerImpl } from '../../Container';
import { withTooltip } from '../../Tooltip';
import { ElementsTypes } from '../ElementsTypes';
import { ClientEvents } from '../Events';
import { Icon } from '../PropertyConstants';
import { createAtom } from './createAtom';
import {
  type AtomsPlacementsTypes,
  AtomsPlacementsValues,
  DirectionProps,
  ListItemSizeProps,
  AlignItemsProps,
  BgColorProps,
  LinkTargetProps,
  ElementType,
  VariantProp,
  RightAtomsTypes,
  ActionTitleTypes,
  IconColorProps,
} from './ListItemConstants';
import { type ListItemEvents } from './ListItemEvents';
import type { ListItemModel } from './models/ListItemModel';
import type { ListItemProps } from './props/ListItemProps';
import { createBadge } from './utils';

type ItemEventClick =
  | ListItemEvents.ActionTitleOnClick
  | ListItemEvents.CheckboxOnChange
  | ListItemEvents.SwitchOnChange
  | ListItemEvents.RadioOnChange
  | ListItemEvents.IconOnClick
  | ListItemEvents.AvatarOnClick
  | ListItemEvents.ButtonOnClick
  | ListItemEvents.CenterButtonOnClick;

// Для обратной совместимости. Старая реализация структуры пропсов не позволяет реализовать их в визуальном редакторе.
const convertActionProps = (item) => {
  if (item?.props) {
    return item;
  }
  return {
    type: item?.type,
    props: { ...item },
  };
};

@withTooltip()
export class ListItemElement extends ContainerImpl<ListItemProps, ListItemModel> {
  static defaultProps: ListItemProps = {
    type: ElementsTypes.LIST_ITEM,
    leftAtom: null,
    rightAtom: null,
    primaryText: '',
    secondaryText: '',
    tertiaryText: '',
  };

  protected _props: ListItemProps;

  private resource: ResourceService;

  constructor({ template, delegate, resource }) {
    super({ template, delegate });
    this.resource = resource;
    this._props = {
      ...ListItemElement.defaultProps,
      ...this._props,
    };
  }

  render() {
    const model = super.render();
    const {
      leftAtom,
      rightAtom,
      primaryText,
      secondaryText,
      tertiaryText,
      buttons,
      divider,
      isLoading,
      disabled,
      isButton,
      selected,
      direction,
      reversePrimaryText,
      withPadding,
      size,
      alignItems,
      bgColor,
      borderRadius,
      disabledActionTitle,
      paddingDense,
      white,
      linkHref,
      linkTarget,
    } = this._props;

    const createTextsValue = (textValue, options = {}) => ({
      value: stringParser(textValue?.value, ''),
      noWrap: !!textValue?.noWrap,
      html: !!textValue?.html,
      ...options,
    });

    model.leftAtom = this.createGridModel(
      AtomsPlacementsValues.left,
      leftAtom,
      ListItemElement.defaultProps.leftAtom,
    );
    model.rightAtom = this.createGridModel(
      AtomsPlacementsValues.right,
      rightAtom,
      ListItemElement.defaultProps.rightAtom,
    );
    model.primaryText = isObject(primaryText)
      ? createTextsValue(primaryText, {
          variant: enumDefaultSetter(VariantProp, primaryText.variant, undefined),
        })
      : stringParser(primaryText, '');
    model.secondaryText = isObject(secondaryText)
      ? createTextsValue(secondaryText)
      : stringParser(secondaryText, '');
    model.tertiaryText = isObject(tertiaryText)
      ? createTextsValue(tertiaryText)
      : stringParser(tertiaryText, '');
    model.actionTitle = this.createActionTitles(this._props.actionTitle);
    model.actionSubtitle = this.createActionTitles(this._props.actionSubtitle);
    model.clipBadge = !!this._props.clipBadge;
    model.iconHover = !!this._props.iconHover;
    model.buttons = Array.isArray(buttons)
      ? buttons.slice(0, 2).map((button) => ({
          id: stringParser(button?.id, ''),
          label: stringParser(button?.label, ''),
          onClick: null,
        }))
      : [];
    model.direction = enumDefaultSetter(DirectionProps, direction, DirectionProps.row);
    model.reversePrimaryText = !!reversePrimaryText;
    model.withPadding = !!withPadding;
    model.isLoading = !!isLoading;
    model.isButton = !!isButton;
    model.disabled = !!disabled;
    model.selected = !!selected;
    model.divider = !!divider;
    model.noWrap = true;
    model.size = enumDefaultSetter(ListItemSizeProps, size, ListItemSizeProps.small);
    model.paddingDense = !!paddingDense;
    model.alignItems = enumDefaultSetter(AlignItemsProps, alignItems, AlignItemsProps.center);
    model.bgColor = enumDefaultSetter(BgColorProps, bgColor, BgColorProps.primary);
    model.borderRadius = !!borderRadius;
    model.disabledActionTitle = !!disabledActionTitle;
    model.white = !!white;
    model.linkHref = stringParser(linkHref, '');
    model.linkTarget = enumDefaultSetter(LinkTargetProps, linkTarget, LinkTargetProps._blank);
    model.childrenElements = this._children.map((el) => el.render());

    return model;
  }

  private createActionTitles(elements) {
    if (Array.isArray(elements)) {
      return elements.map((item) => {
        const { type, props } = convertActionProps(item);
        if (type === ElementType.icon || type === ElementType.iconButton) {
          return {
            type,
            props: {
              ...props,
              icon: enumDefaultSetter(Icon, props?.icon, Icon.save),
            },
          };
        }
        if (type === ElementType.badge) {
          return {
            type,
            props: {
              ...createBadge(props),
              icon: enumDefaultSetter(Icon, props?.icon, null),
              iconColor: enumDefaultSetter(IconColorProps, props?.iconColor, undefined),
            },
          };
        }
        return null;
      });
    }
    return [];
  }

  private createGridModel(placement: AtomsPlacementsTypes, item: { [key: string]: any }, defaultValue: any) {
    if (item === null || !isObject(item)) {
      return defaultValue;
    }
    return createAtom(placement, item, this.resource);
  }

  handleCustomEvents(event) {
    const { id, placement, target, name: callbackName } = event;
    const withEventCallback = (callback) => callback && typeof callback === 'function';
    let eventCallback;
    let eventArg: { [key: string]: any } = {
      id,
      placement,
      target,
      ...event,
    };

    if (!placement) {
      const { buttonId, index } = event;
      eventArg = { ...eventArg, buttonId };
      eventCallback = this._props?.buttons?.[index]?.[callbackName];
    } else {
      const propName = `${placement}Atom`;
      if (this._props?.[propName]?.type === RightAtomsTypes.multiple && this._props?.[propName]?.content) {
        const { index } = event;
        eventCallback = this._props?.[propName]?.content?.[index]?.[callbackName];
      } else {
        eventCallback = this._props?.[propName]?.[callbackName];
      }
    }

    return withEventCallback(eventCallback) && eventCallback(eventArg);
  }

  handleActionTitleEvents(event) {
    const { id, target, actionTitleType, index, name: callbackName } = event;
    const withEventCallback = (callback) => callback && typeof callback === 'function';
    const eventCallback = this._props?.[actionTitleType]?.[index]?.props[callbackName];
    return withEventCallback(eventCallback) && eventCallback({ id, name: callbackName, target });
  }

  public publishEvent(event: ClientEvents, value: ItemEventClick) {
    // @ts-expect-error
    // eslint-disable-next-line prettier/prettier
    if (
      event === ClientEvents.custom &&
      !(
        value.actionTitleType === ActionTitleTypes.actionTitle ||
        value.actionTitleType === ActionTitleTypes.actionSubtitle
      )
    ) {
      return this.handleCustomEvents(value);
    }
    //@ts-expect-error
    // eslint-disable-next-line prettier/prettier
    if (
      event === ClientEvents.custom &&
      (value.actionTitleType === ActionTitleTypes.actionTitle ||
        value.actionTitleType === ActionTitleTypes.actionSubtitle)
    ) {
      return this.handleActionTitleEvents(value);
    }
    return super.publishEvent(event, value);
  }
}
